const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const midtransClient = require('midtrans-client');

// Inisialisasi Midtrans Snap
const snap = new midtransClient.Snap({
    isProduction: false, // Ganti ke true jika sudah live
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY
});

/**
 * FUNGSI YANG DISEMPURNAKAN: Mencari atau membuat user (baik guest maupun user asli)
 * berdasarkan email dan deviceID.
 */
const findOrCreateUser = async (contactEmail, deviceID) => {
    // Prioritaskan email jika diisi
    if (contactEmail) {
        // 1. Cek apakah sudah ada user (baik guest maupun asli) dengan email ini
        const [existingByEmail] = await db.query('SELECT id FROM users WHERE email = ?', [contactEmail]);
        if (existingByEmail.length > 0) {
            // Jika ada, langsung gunakan ID user tersebut.
            // Ini secara otomatis menghubungkan transaksi tamu ke akun yang mungkin sudah ada.
            return existingByEmail[0].id;
        }
    }

    // Jika tidak ada user dengan email tersebut, gunakan deviceID
    const [existingByDevice] = await db.query('SELECT id FROM users WHERE device_id = ?', [deviceID]);
    if (existingByDevice.length > 0) {
        return existingByDevice[0].id;
    }

    // Jika tidak ditemukan sama sekali, buat user tamu baru DENGAN EMAIL
    const guestUsername = `Guest_${deviceID.substring(6, 12)}`;
    const [newUser] = await db.query(
        `INSERT INTO users (username, email, role, status, device_id) VALUES (?, ?, 'guest', 1, ?)`,
        [guestUsername, contactEmail || null, deviceID] // Simpan email jika ada, jika tidak simpan NULL
    );
    return newUser.insertId;
};


const createTransaction = async (req, res) => {
  try {
    let userId;
    const {
      selectedItem,
      playerData,
      contactEmail,
      contactWhatsapp,
      productDetails,
      deviceID // Ambil deviceID dari body
    } = req.body;

    // LOGIKA CERDAS YANG DIPERBARUI
    if (req.user && req.user.id) {
        // Jika user login, langsung gunakan ID dari token
        userId = req.user.id;
    } else {
        // Jika tidak login (tamu), gunakan fungsi helper baru kita
        if (!deviceID) {
            return res.status(400).json({ error: 'Device ID tidak ditemukan. Transaksi tamu gagal.' });
        }
        userId = await findOrCreateUser(contactEmail, deviceID);
    }

    // Validasi sisa data
    if (!selectedItem || !playerData || !productDetails) {
      return res.status(400).json({ error: 'Data pesanan tidak lengkap.' });
    }

    // ... (Sisa logika parsing Player ID tidak berubah) ...
    let finalPlayerId = null, finalPlayerZone = null, finalPlayerServer = null;
    switch (productDetails.input_type) {
        case 'id_zone':
            const match = playerData.raw.match(/(\d+)\s*\((\d+)\)/);
            if (!match) return res.status(400).json({ error: 'Format Player ID salah.' });
            finalPlayerId = match[1]; finalPlayerZone = match[2];
            break;
        case 'id_server':
            if (!playerData.server) return res.status(400).json({ error: 'Server harus dipilih.' });
            finalPlayerId = playerData.raw; finalPlayerServer = playerData.server;
            break;
        default:
            finalPlayerId = playerData.raw;
            break;
    }

    const totalPrice = selectedItem.selling_price;
    const invoiceNumber = `GTP-${uuidv4().substring(0, 8).toUpperCase()}`;
    
    await db.query(
      `INSERT INTO transactions (invoice_number, user_id, product_item_id, player_id, player_zone, player_server, contact_email, contact_whatsapp, total_price, payment_method, status, transaction_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'midtrans', 'PENDING', NOW())`,
      [invoiceNumber, userId, selectedItem.id, finalPlayerId, finalPlayerZone, finalPlayerServer, contactEmail, contactWhatsapp, totalPrice]
    );
    
    const parameter = {
        transaction_details: { order_id: invoiceNumber, gross_amount: totalPrice },
        item_details: [{ id: selectedItem.id, price: totalPrice, quantity: 1, name: `${productDetails.name} - ${selectedItem.name}` }],
        customer_details: { email: contactEmail, phone: contactWhatsapp }
    };

    const snapToken = await snap.createTransactionToken(parameter);

    res.status(201).json({ message: 'Transaksi berhasil dibuat.', snapToken: snapToken });

  } catch (err) {
    console.error("Create Transaction Error:", err);
    // Kirim pesan error dari database jika itu adalah 'duplicate entry'
    if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: `Data sudah ada: ${err.message}`});
    }
    res.status(500).json({ error: err.message || 'Terjadi kesalahan pada server.' });
  }
};

/**
 * FUNGSI BARU: Untuk menerima notifikasi dari Midtrans (Webhook)
 */
const handleMidtransNotification = async (req, res) => {
    try {
        // 1. Buat notifikasi dari body request
        const notificationJson = req.body;
        const statusResponse = await snap.transaction.notification(notificationJson);
        
        // 2. Ambil data penting dari notifikasi
        const orderId = statusResponse.order_id;
        const transactionStatus = statusResponse.transaction_status;
        const fraudStatus = statusResponse.fraud_status;

        console.log(`Menerima notifikasi untuk Order ID ${orderId}: ${transactionStatus}`);

        // 3. Update status transaksi di database Anda
        let newStatus = 'PENDING';
        if (transactionStatus == 'capture' || transactionStatus == 'settlement') {
            if (fraudStatus == 'accept') {
                newStatus = 'SUCCESS';
            }
        } else if (transactionStatus == 'cancel' || transactionStatus == 'deny' || transactionStatus == 'expire') {
            newStatus = 'FAILED';
        }

        await db.query(
            'UPDATE transactions SET status = ? WHERE invoice_number = ?',
            [newStatus, orderId]
        );

        // 4. Kirim respons 200 OK ke Midtrans
        res.status(200).send('Notification received successfully.');

    } catch (error) {
        console.error('Midtrans Notification Error:', error.message);
        res.status(500).send('Internal Server Error');
    }
};

// const getUserTransactions = async (req, res) => {
//   try {
//     let userId;

//     // LOGIKA CERDAS: Cek apakah user login atau tamu
//     if (req.user && req.user.id) {
//         // Jika user login, gunakan ID dari token
//         userId = req.user.id;
//     } else {
//         // Jika tamu, ambil Device ID yang dikirim dari frontend
//         const { deviceID } = req.query;
//         if (!deviceID) {
//             // Jika tidak ada Device ID, berarti tidak bisa melacak riwayat tamu
//             return res.json([]); // Kirim array kosong
//         }
//         // Cari user_id yang cocok dengan deviceID
//         const [guestUser] = await db.query('SELECT id FROM users WHERE device_id = ?', [deviceID]);
//         if (guestUser.length === 0) {
//             // Jika tidak ada user tamu dengan ID ini, berarti belum ada transaksi
//             return res.json([]); // Kirim array kosong
//         }
//         userId = guestUser[0].id;
//     }

//     // Query yang lebih lengkap untuk mengambil semua data yang dibutuhkan
//     const [transactions] = await db.query(
//       `SELECT 
//         t.id, t.invoice_number, t.transaction_date, t.total_price, t.status,
//         t.player_id, t.player_zone, t.player_server, t.payment_method,
//         pi.name AS item_name, p.name AS product_name, p.logo_url
//        FROM transactions t
//        JOIN product_items pi ON t.product_item_id = pi.id
//        JOIN item_groups ig ON pi.item_group_id = ig.id
//        JOIN products p ON ig.product_id = p.id
//        WHERE t.user_id = ? 
//        ORDER BY t.transaction_date DESC`,
//       [userId]
//     );
    
//     res.json(transactions);

//   } catch (err) {
//     console.error("Get User Transactions Error:", err);
//     res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
//   }
// };

const getUserTransactions = async (req, res) => {
  try {
    let userIds = [];
    
    // Jika user login, tambahkan user_id
    if (req.user && req.user.id) {
        userIds.push(req.user.id);
    }
    
    // Jika ada deviceID, cari user guest terkait
    const { deviceID } = req.query;
    if (deviceID) {
        const [guestUsers] = await db.query('SELECT id FROM users WHERE device_id = ?', [deviceID]);
        guestUsers.forEach(user => userIds.push(user.id));
    }

    // Jika tidak ada user ID sama sekali
    if (userIds.length === 0) {
        return res.json([]);
    }

    // Query dengan IN clause untuk semua user ID
    const [transactions] = await db.query(
      `SELECT 
        t.id, t.invoice_number, t.transaction_date, t.total_price, t.status,
        t.player_id, t.player_zone, t.player_server, t.payment_method,
        pi.name AS item_name, p.name AS product_name, p.logo_url
       FROM transactions t
       JOIN product_items pi ON t.product_item_id = pi.id
       JOIN item_groups ig ON pi.item_group_id = ig.id
       JOIN products p ON ig.product_id = p.id
       WHERE t.user_id IN (?)
       ORDER BY t.transaction_date DESC`,
      [userIds]
    );
    
    res.json(transactions);
  } catch (err) {
    console.error("Get User Transactions Error:", err);
    res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  }
};


module.exports = {
  createTransaction,
  getUserTransactions,
  handleMidtransNotification // <-- Export fungsi baru
};
