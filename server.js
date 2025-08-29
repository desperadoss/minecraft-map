const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serving static files
app.use(express.static(path.join(__dirname)));
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB database connection - removed deprecated options
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB database connection successful!');
    } catch (err) {
        console.error('Database connection error:', err);
        // Exiting the process is a good practice if the database is critical
        process.exit(1);
    }
};

// Schemas & Models
const pointSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    description: {
        type: String,
        trim: true,
        maxlength: 500
    },
    x: {
        type: Number,
        required: true
    },
    z: {
        type: Number,
        required: true
    },
    resourceType: {
        type: String,
        required: true
    },
    ownerSessionCode: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['public', 'private', 'pending'],
        default: 'private'
    }
}, { timestamps: true });

const Point = mongoose.model('Point', pointSchema);

const allowedSessionSchema = new mongoose.Schema({
    sessionCode: {
        type: String,
        required: true,
        unique: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const AllowedSession = mongoose.model('AllowedSession', allowedSessionSchema);

const adminSchema = new mongoose.Schema({
    sessionCode: {
        type: String,
        required: true,
        unique: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Admin = mongoose.model('Admin', adminSchema);


// Helper function for owner/admin verification
const isUserOwner = (sessionCode) => {
    const OWNER_SESSION_CODES = ['270ea844-8ab8-4ea1-a34c-18ea2e6a920a', '301263ee-49a9-4575-8c3d-f784bae7b27d'];
    return OWNER_SESSION_CODES.includes(sessionCode);
};

const verifyAdmin = async (sessionCode) => {
    const isAdmin = await Admin.findOne({ sessionCode });
    return !!isAdmin;
};

// API Routes
app.get('/api/points', async (req, res) => {
    try {
        const sessionCode = req.header('X-Session-Code');
        const isOwner = isUserOwner(sessionCode);
        const isAdmin = await verifyAdmin(sessionCode);

        const privatePoints = await Point.find({
            $or: [
                { ownerSessionCode: sessionCode, status: { $ne: 'pending' } },
                { status: 'private', ownerSessionCode: sessionCode } // This seems redundant, but keeps it explicit
            ]
        });

        const publicPoints = await Point.find({ status: 'public' });

        res.json({ privatePoints, publicPoints });
    } catch (err) {
        console.error('Error fetching points:', err);
        res.status(500).json({ message: 'Error fetching points.' });
    }
});

app.post('/api/points', async (req, res) => {
    try {
        const { name, x, z, resourceType, description, status } = req.body;
        const ownerSessionCode = req.header('X-Session-Code');

        if (!name || !x || !z || !resourceType || !ownerSessionCode) {
            return res.status(400).json({ message: 'Missing required fields.' });
        }

        const newPoint = new Point({
            name,
            x,
            z,
            resourceType,
            description,
            ownerSessionCode,
            status: status || 'private'
        });

        await newPoint.save();
        res.status(201).json({ message: 'Point saved successfully.', point: newPoint });
    } catch (err) {
        console.error('Error creating point:', err);
        res.status(500).json({ message: 'Error creating point.' });
    }
});

app.put('/api/points/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const sessionCode = req.header('X-Session-Code');
        const { name, x, z, resourceType, description, status } = req.body;

        const point = await Point.findById(id);
        if (!point) {
            return res.status(404).json({ message: 'Point not found.' });
        }

        const isOwner = point.ownerSessionCode === sessionCode;
        const isAdmin = await verifyAdmin(sessionCode);

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: 'You do not have permission to edit this point.' });
        }

        // Allow updates to all fields except ownerSessionCode and id
        const updateData = { name, x, z, resourceType, description, status };
        Object.keys(updateData).forEach(key => {
            if (updateData[key] !== undefined) {
                point[key] = updateData[key];
            }
        });

        await point.save();
        res.json({ message: 'Point updated successfully.', point });
    } catch (err) {
        console.error('Error updating point:', err);
        res.status(500).json({ message: 'Error updating point.' });
    }
});

app.delete('/api/points/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const sessionCode = req.header('X-Session-Code');

        const point = await Point.findById(id);
        if (!point) {
            return res.status(404).json({ message: 'Point not found.' });
        }

        const isOwner = point.ownerSessionCode === sessionCode;
        const isAdmin = await verifyAdmin(sessionCode);

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: 'You do not have permission to delete this point.' });
        }

        await Point.findByIdAndDelete(id);
        res.json({ message: 'Point deleted successfully.' });
    } catch (err) {
        console.error('Error deleting point:', err);
        res.status(500).json({ message: 'Error deleting point.' });
    }
});

// Admin API
app.get('/api/admin/pending', async (req, res) => {
    const sessionCode = req.header('X-Session-Code');
    const isAdmin = await verifyAdmin(sessionCode);

    if (!isAdmin) {
        return res.status(403).json({ message: 'Not an administrator.' });
    }
    try {
        const pendingPoints = await Point.find({ status: 'pending' });
        res.json(pendingPoints);
    } catch (err) {
        console.error('Error fetching pending points:', err);
        res.status(500).json({ message: 'Server error fetching pending points.' });
    }
});

app.put('/api/admin/approve/:id', async (req, res) => {
    const sessionCode = req.header('X-Session-Code');
    const isAdmin = await verifyAdmin(sessionCode);

    if (!isAdmin) {
        return res.status(403).json({ message: 'Not an administrator.' });
    }
    try {
        const point = await Point.findByIdAndUpdate(req.params.id, { status: 'public' }, { new: true });
        if (!point) return res.status(404).json({ message: 'Point not found.' });
        res.json({ message: 'Point approved successfully.' });
    } catch (err) {
        console.error('Error approving point:', err);
        res.status(500).json({ message: 'Server error.' });
    }
});

app.delete('/api/admin/deny/:id', async (req, res) => {
    const sessionCode = req.header('X-Session-Code');
    const isAdmin = await verifyAdmin(sessionCode);

    if (!isAdmin) {
        return res.status(403).json({ message: 'Not an administrator.' });
    }
    try {
        const point = await Point.findByIdAndDelete(req.params.id);
        if (!point) return res.status(404).json({ message: 'Point not found.' });
        res.json({ message: 'Point denied and deleted.' });
    } catch (err) {
        console.error('Error denying point:', err);
        res.status(500).json({ message: 'Server error.' });
    }
});


// Owner API
app.post('/api/owner/promote', async (req, res) => {
    const sessionCode = req.header('X-Session-Code');
    if (!isUserOwner(sessionCode)) {
        return res.status(403).json({ message: 'Not an owner.' });
    }
    const { sessionCode: codeToPromote } = req.body;
    if (!codeToPromote) {
        return res.status(400).json({ message: 'Missing session code.' });
    }

    try {
        const admin = new Admin({ sessionCode: codeToPromote });
        await admin.save();
        res.status(201).json({ message: 'User promoted to admin.' });
    } catch (err) {
        if (err.code === 11000) { // Duplicate key error
            return res.status(409).json({ message: 'User is already an admin.' });
        }
        console.error('Error promoting user:', err);
        res.status(500).json({ message: 'Error promoting user.' });
    }
});

app.post('/api/owner/sessions', async (req, res) => {
    const sessionCode = req.header('X-Session-Code');
    if (!isUserOwner(sessionCode)) {
        return res.status(403).json({ message: 'Not an owner.' });
    }
    const { sessionCode: code } = req.body;
    if (!code) {
        return res.status(400).json({ message: 'Missing session code.' });
    }
    try {
        const newSession = new AllowedSession({ sessionCode: code });
        await newSession.save();
        res.status(201).json({ message: 'Session added successfully.' });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ message: 'Session already exists.' });
        }
        console.error('Error adding session:', err);
        res.status(500).json({ message: 'Error adding session.' });
    }
});

app.get('/api/owner/sessions', async (req, res) => {
    const sessionCode = req.header('X-Session-Code');
    if (!isUserOwner(sessionCode)) {
        return res.status(403).json({ message: 'Not an owner.' });
    }
    try {
        const sessions = await AllowedSession.find({});
        res.json(sessions);
    } catch (err) {
        console.error('Error fetching allowed sessions:', err);
        res.status(500).json({ message: 'Error fetching allowed sessions.' });
    }
});

app.delete('/api/owner/sessions/:code', async (req, res) => {
    const sessionCode = req.header('X-Session-Code');
    if (!isUserOwner(sessionCode)) {
        return res.status(403).json({ message: 'Not an owner.' });
    }
    try {
        await AllowedSession.deleteOne({ sessionCode: req.params.code });
        res.json({ message: 'Session deleted successfully.' });
    } catch (err) {
        console.error('Error deleting session:', err);
        res.status(500).json({ message: 'Error deleting session.' });
    }
});

// Catch-all route for SPA - must be at the end
app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ message: 'Endpoint not found' });
    }
    const indexPath = path.join(__dirname, 'index.html');
    res.sendFile(indexPath, (err) => {
        if (err) {
            console.error('Catch-all: Error sending index.html:', err);
            res.status(404).send('Page not found');
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ message: 'Internal server error' });
});

// Start server
const startServer = async () => {
    await connectDB();
    
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`URL: http://localhost:${PORT}`);
    });
};

startServer();
