const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('./')); // Serve HTML/JS/CSS files from root

const JWT_SECRET = "college_project_secret_prime";

// --- MONGODB CONNECTION ---
mongoose.connect('mongodb://127.0.0.1:27017/primeDb')
    .then(() => console.log('✅ Connected to MongoDB (primeDb)!'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// --- MONGODB MODELS ---
const UserSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true, required: true },
    phone: { type: String, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: "public" }, // admin vs public
    city: { type: String, default: "" },
    address: { type: String, default: "" },
    cardToken: String, // Used for "Save Card"
    cart: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Property' }],
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Property' }]
});
const User = mongoose.model('User', UserSchema);

const PropertySchema = new mongoose.Schema({
    title: String, type: String, category: String, // Villa, Apartment, Plot
    price: Number, address: String, beds: Number, baths: Number,
    area: Number, amenities: [String], image: String, 
    isBooked: { type: Boolean, default: false },
    isComingSoon: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false }
}, { timestamps: true });
const Property = mongoose.model('Property', PropertySchema);

const BookingSchema = new mongoose.Schema({
    bookingId: String, 
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    properties: [Object],
    amount: Number, paymentMethod: String, status: String,
    createdAt: { type: Date, default: Date.now }
});
const Booking = mongoose.model('Booking', BookingSchema);

// --- MIDDLEWARE ---
const authGuard = (req, res, next) => {
    try {
        const token = req.headers.authorization.split(" ")[1];
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (err) { res.status(401).json({ message: "Login required." }); }
}

// --- SEEDER FUNCTION ---
async function seedProperties() {
    // We wipe and re-seed to ensure the user's requested 5 properties are fresh and clean
    console.log('Refreshing Database (Properties, Users, Bookings)...');
    
    // Properties
    const count = await Property.countDocuments();
    if (count === 0) {
        await Property.deleteMany({}); 
        const seededProps = await Property.insertMany([
            { 
                title: "The Zenith Skyscraper", type: "commercial", category: "Commercial", 
                price: 250000000, address: "GIFT City, Gujarat", beds: 0, baths: 10, 
                area: 50000, amenities: ["Helipad", "AI Managed", "Zero Carbon"], 
                image: "https://images.unsplash.com/photo-1486406146926-c627a92ad11ab?w=800",
                isFeatured: true, isComingSoon: true
            },
            { 
                title: "Emerald Garden Apartment", type: "apartment", category: "Residential", 
                price: 8500000, address: "SG Highway, Ahmedabad", beds: 3, baths: 3, 
                area: 1800, amenities: ["Garden", "Clubhouse", "Gym"], 
                image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800"
            },
            { 
                title: "Skyline Studio Loft", type: "apartment", category: "Residential", 
                price: 4500000, address: "Hinjewadi, Pune", beds: 1, baths: 1, 
                area: 750, amenities: ["City View", "Smart Home", "Pool"], 
                image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800"
            },
            { 
                title: "Royal Heritage Villa", type: "villa", category: "Residential", 
                price: 35000000, address: "Amer Road, Jaipur", beds: 5, baths: 6, 
                area: 5500, amenities: ["Private Pool", "Courtyard", "Spa"], 
                image: "https://images.unsplash.com/photo-1613490908578-15c10a4e76ea?w=800"
            },
            { 
                title: "Modern Tech Office", type: "office", category: "Commercial", 
                price: 12000000, address: "Whitefield, Bangalore", beds: 0, baths: 2, 
                area: 2500, amenities: ["High-speed Internet", "Cafeteria", "Parking"], 
                image: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800"
            }
        ]);
        console.log('✅ Seeded 5 Properties.');

        // Admin Seeding
        const adminEmail = "admin@prime.in";
        let admin = await User.findOne({ email: adminEmail });
        if (!admin) {
            const hash = await bcrypt.hash("admin123", 10);
            admin = await User.create({
                name: "Diya (Admin)",
                email: adminEmail,
                phone: "91-9876543210",
                password: hash,
                role: "admin",
                city: "Ahmedabad",
                address: "Prime Plaza, Sector 1"
            });
            console.log('✅ Seeded Admin User (admin@prime.in / admin123).');
        }

        // Booking Seeding
        const bookingCount = await Booking.countDocuments();
        if (bookingCount === 0) {
            await Booking.create({
                bookingId: "GST-DEMO-001",
                userId: admin._id,
                properties: [seededProps[1]],
                amount: 8500000,
                paymentMethod: "Credit Card",
                status: "PAID"
            });
            console.log('✅ Seeded Demo Booking.');
        }
    }
}
seedProperties();

// --- ROUTES ---

// 1. Auth 
app.post("/api/auth/signup", async (req, res) => {
    try {
        const { name, email, phone, password, role } = req.body;
        const hash = await bcrypt.hash(password, 10);
        let finalPhone = phone;
        if (!finalPhone) {
            finalPhone = `sys-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        }
        const user = await User.create({ name, email, phone: finalPhone, password: hash, role: role || "public" });
        const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET);
        res.json({ token, user: { _id: user._id, name, email, phone: finalPhone, role: user.role } });
    } catch (err) { res.status(400).json({ message: "Registration failed or email exists." }); }
});

app.post("/api/auth/login", async (req, res) => {
    try {
        const { email, phone, password } = req.body;
        // Search by email OR phone robustly
        let query = {};
        if (email) query.email = email;
        if (phone && !email) query.phone = phone;
        
        const user = await User.findOne(query);
        if (!user || !(await bcrypt.compare(password, user.password))) {
             return res.status(400).json({ message: "Invalid credentials. Please Create Account first if you are new!" });
        }
        const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET);
        res.json({ token, user: { _id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role } });
    } catch (err) { res.status(500).json({ message: "Server error" }); }
});

app.get("/api/auth/me", authGuard, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");
        if (!user) return res.status(401).json({ message: "User not found" });
        res.json({ user });
    } catch (err) { 
        res.status(401).json({ message: "Session invalid or expired." }); 
    }
});

app.post("/api/auth/savecard", authGuard, async (req, res) => {
    // Stores a dummy card token for the "Save Card" feature
    await User.findByIdAndUpdate(req.user.id, { cardToken: "token_mock_1234" });
    res.json({ success: true, message: "Card saved securely." });
});

// 2. Properties
app.get("/api/properties", async (req, res) => {
    try {
        let query = {};
        const { text, type, budget } = req.query;

        // Text Search
        if (text) {
            query.$or = [
                { title: { $regex: text, $options: 'i' } },
                { address: { $regex: text, $options: 'i' } }
            ];
        }

        // Type Filter
        if (type && type !== 'all') {
            query.type = type.toLowerCase();
        }

        // Budget Filter
        if (budget) {
            query.price = {};
            if (budget === '50-100') {
                query.price = { $gte: 5000000, $lte: 10000000 };
            } else if (budget === '100-200') {
                query.price = { $gte: 10000000, $lte: 20000000 };
            } else if (budget === '200+') {
                query.price = { $gte: 20000000 };
            }
        }

        const properties = await Property.find(query);
        res.json({ properties });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch properties" });
    }
});

// 2.2 Wishlist (Favorites)
app.get("/api/auth/favorites", authGuard, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate('wishlist');
        if (!user) return res.status(401).json({ message: "User not found" });
        res.json({ favorites: user.wishlist || [] });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post("/api/auth/favorites", authGuard, async (req, res) => {
    try {
        const { propertyId } = req.body;
        await User.findByIdAndUpdate(req.user.id, { $addToSet: { wishlist: propertyId } });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.delete("/api/auth/favorites/:id", authGuard, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user.id, { $pull: { wishlist: req.params.id } });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// 2.5 Cart
app.post("/api/cart/add", authGuard, async (req, res) => {
    try {
        const { propertyId } = req.body;
        await User.findByIdAndUpdate(req.user.id, { $addToSet: { cart: propertyId } });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get("/api/cart", authGuard, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate('cart');
        res.json({ cart: user.cart || [] });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.delete("/api/cart", authGuard, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user.id, { $set: { cart: [] } });
        res.json({ success: true, message: "Cart cleared" });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// 3. Cart & Payment Logic
app.post("/api/payment/confirm", authGuard, async (req, res) => {
    try {
        const { propertyIds, paymentMethod, payerDetails } = req.body;
        const properties = await Property.find({ _id: { $in: propertyIds } });

        let subtotal = properties.reduce((acc, p) => acc + p.price, 0);
        let tax = Math.round(subtotal * 0.05); // 5% GST
        let amount = subtotal + tax;

        const isPreRegistration = properties.some(p => p.isComingSoon === true);
        const bookingStatus = isPreRegistration ? "PRE-REGISTERED" : "PAID";
        if (isPreRegistration) {
            amount = amount / 2; // 50% deposit for coming soon properties
        }

        const bookingId = "GST-" + Math.floor(Math.random() * 90000 + 10000);

        const booking = await Booking.create({
            bookingId, userId: req.user.id, amount, paymentMethod, status: bookingStatus, properties
        });

        // Mark properties as booked and clear cart
        await Property.updateMany({ _id: { $in: propertyIds } }, { isBooked: true });
        await User.findByIdAndUpdate(req.user.id, { $set: { cart: [] } });

        // Email Sending Logic (Fully Working via Ethereal Testing)
        try {
            // Automatically generate a test account for local development
            let testAccount = await nodemailer.createTestAccount();
            
            let transporter = nodemailer.createTransport({
                host: "smtp.ethereal.email",
                port: 587,
                secure: false, // true for 465, false for other ports
                auth: {
                    user: testAccount.user, 
                    pass: testAccount.pass,  
                },
            });

            let mailOptions = {
                from: '"Prime Real Estate (Automated)" <noreply@primeproperties.in>',
                to: payerDetails.payerEmail,
                subject: `Payment ${bookingStatus} - Booking ID: ${bookingId}`,
                html: `
                    <h2>Payment Confirmed!</h2>
                    <p>Dear <b>${payerDetails.payerName}</b>,</p>
                    <p>Your transaction was successful. You just paid <b>₹${amount.toLocaleString('en-IN')}</b> for the properties below.</p>
                    <p><strong>Status:</strong> ${bookingStatus}</p>
                    <ul>
                        ${properties.map(p => `<li>${p.title} - ₹${p.price.toLocaleString('en-IN')}</li>`).join('')}
                    </ul>
                    <p>Thank you for choosing Prime Real Estate.</p>
                `
            };

            let info = await transporter.sendMail(mailOptions);
            const previewUrl = nodemailer.getTestMessageUrl(info);
            console.log("✅ Email successfully sent to:", payerDetails.payerEmail);
            console.log("🔗 View Email Preview Here: %s", previewUrl);
            
            return res.json({ booking, emailSent: true, previewUrl });
        } catch (mailErr) {
            console.error("❌ Email sending failed:", mailErr);
            return res.json({ booking, emailSent: false, error: mailErr.message });
        }
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// 4. Bookings Dashboard
const adminGuard = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: "Admin access required." });
    }
};

app.get("/api/admin/stats", authGuard, adminGuard, async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalProperties = await Property.countDocuments();
        const totalBookings = await Booking.countDocuments();
        const bookings = await Booking.find({ status: { $ne: 'CANCELLED' } });
        const totalRevenue = bookings.reduce((sum, b) => sum + b.amount, 0);
        res.json({ totalUsers, totalProperties, totalBookings, totalRevenue });
    } catch (err) { res.status(500).json({ message: "Error fetching stats" }); }
});

app.get("/api/bookings/users", authGuard, adminGuard, async (req, res) => {
    try {
        const users = await User.find({}).select("-password");
        res.json({ users });
    } catch (err) { res.status(500).json({ message: "Error fetching users" }); }
});

app.put("/api/bookings/users/:id", authGuard, adminGuard, async (req, res) => {
    try {
        const { name, role, phone, city, address } = req.body;
        await User.findByIdAndUpdate(req.params.id, { name, role, phone, city, address });
        res.json({ success: true, message: "User updated successfully" });
    } catch (err) { res.status(500).json({ message: "Error updating user" }); }
});

app.delete("/api/bookings/users/:id", authGuard, adminGuard, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "User deleted successfully" });
    } catch (err) { res.status(500).json({ message: "Error deleting user" }); }
});

// --- Property Management (Admin) ---
app.post("/api/properties", authGuard, adminGuard, async (req, res) => {
    try {
        const property = await Property.create(req.body);
        res.json({ success: true, property });
    } catch (err) { res.status(500).json({ message: "Error creating property" }); }
});

app.put("/api/properties/:id", authGuard, adminGuard, async (req, res) => {
    try {
        const property = await Property.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ success: true, property });
    } catch (err) { res.status(500).json({ message: "Error updating property" }); }
});

app.delete("/api/properties/:id", authGuard, adminGuard, async (req, res) => {
    try {
        await Property.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Property deleted" });
    } catch (err) { res.status(500).json({ message: "Error deleting property" }); }
});

app.get("/api/bookings/all", authGuard, adminGuard, async (req, res) => {
    try {
        const bookings = await Booking.find({}).populate('userId').sort({ createdAt: -1 });
        
        const formatted = await Promise.all(bookings.map(async (b) => {
            let user = b.userId;
            
            // Fallback for cases where userId was a string or populate didn't work
            if (user && typeof user === 'string') {
                user = await User.findById(user).select("-password");
            }

            return {
                _id: b._id,
                bookingId: b.bookingId,
                amount: b.amount,
                status: b.status,
                createdAt: b.createdAt,
                propertyTitle: b.properties.map(p => p.title).join(", "),
                paymentMethod: b.paymentMethod,
                customerName: user ? user.name : "Unknown",
                customerPhone: user ? user.phone : "N/A",
                customerEmail: user ? user.email : "N/A"
            };
        }));
        res.json({ bookings: formatted });
    } catch (err) { res.status(500).json({ message: "Error fetching all bookings" }); }
});

app.put("/api/bookings/all/:id", authGuard, adminGuard, async (req, res) => {
    try {
        const { status } = req.body;
        await Booking.findByIdAndUpdate(req.params.id, { status });
        res.json({ success: true, message: "Booking status updated" });
    } catch (err) { res.status(500).json({ message: "Error updating booking" }); }
});

app.delete("/api/bookings/all/:id", authGuard, adminGuard, async (req, res) => {
    try {
        await Booking.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Booking deleted successfully" });
    } catch (err) { res.status(500).json({ message: "Error deleting booking" }); }
});


app.get("/api/bookings/mine", authGuard, async (req, res) => {
    try {
        const bookings = await Booking.find({ userId: req.user.id }).sort({ createdAt: -1 });
        // Format them for the frontend
        const formatted = bookings.map(b => ({
            bookingId: b.bookingId,
            amount: b.amount,
            status: b.status,
            createdAt: b.createdAt,
            propertyTitle: b.properties.map(p => p.title).join(", ")
        }));
        res.json({ bookings: formatted });
    } catch (err) { res.status(500).json({ message: "Error fetching bookings" }); }
});

const PORT = 5005;
app.listen(PORT, () => console.log(`🚀 Prime Backend running on http://localhost:${PORT}`));
