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

// MongoDB database connection
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB database connection successful!');
    } catch (err) {
        console.error('Database connection error:', err);
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
    ownerSessionCode: {
        type: String,
        required: true,
        trim: true,
    },
    status: {
        type: String,
        enum: ['pending', 'public', 'private'],
        default: 'pending'
    },
    resourceType: {
        type: String,
        trim: true,
        required: false
    }
}, { timestamps: true });

const sessionSchema = new mongoose.Schema({
    sessionCode: {
        type: String,
        required: true,
        unique: true
    }
});

const Point = mongoose.model('Point', pointSchema);
const AllowedSession = mongoose.model('AllowedSession', sessionSchema);

// --- AUTHENTICATION & PERMISSIONS ---
// Owner authentication middleware
const isOwner = (req, res, next) => {
    const sessionCode = req.headers['x-session-code'];
    if (sessionCode === process.env.OWNER_SESSION_CODE) {
        req.isOwner = true;
        next();
    } else {
        res.status(403).json({ message: 'Forbidden: Owner access required' });
    }
};

// Admin authentication middleware
const isAdmin = async (req, res, next) => {
    const sessionCode = req.headers['x-session-code'];
    const ownerSessionCode = process.env.OWNER_SESSION_CODE;

    if (sessionCode === ownerSessionCode) {
        req.isAdmin = true;
        req.isOwner = true;
        return next();
    }

    try {
        const foundSession = await AllowedSession.findOne({ sessionCode });
        if (foundSession) {
            req.isAdmin = true;
            return next();
        }
        res.status(403).json({ message: 'Forbidden: Admin access required' });
    } catch (err) {
        console.error('isAdmin middleware error:', err);
        res.status(500).json({ message: 'Server error during admin check' });
    }
};

// --- ROUTES ---

// Admin login route - MODIFIED to use a password
app.post('/api/admin/login', async (req, res) => {
    const { password, sessionCode } = req.body;
    if (password === process.env.ADMIN_PASSWORD) {
        try {
            // Check if the session code is already in the AllowedSessions collection
            const existingSession = await AllowedSession.findOne({ sessionCode });
            if (existingSession) {
                return res.json({ message: 'Admin login successful!' });
            }
            // Add the session code to the allowed sessions list
            await AllowedSession.create({ sessionCode });
            res.json({ message: 'Admin login successful!' });
        } catch (err) {
            console.error('Error adding admin session:', err);
            res.status(500).json({ message: 'Error logging in.' });
        }
    } else {
        res.status(401).json({ message: 'Invalid admin password.' });
    }
});

// Admin panel API - get pending points
app.get('/api/admin/pending', isAdmin, async (req, res) => {
    try {
        const pendingPoints = await Point.find({ status: 'pending' });
        res.json(pendingPoints);
    } catch (err) {
        console.error('Error fetching pending points:', err);
        res.status(500).json({ message: 'Error fetching pending points.' });
    }
});

// Admin panel API - update point status
app.patch('/api/admin/points/:id/status', isAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        const pointId = req.params.id;

        if (status === 'rejected') {
            await Point.findByIdAndDelete(pointId);
            return res.json({ message: 'Point rejected and deleted.' });
        }

        if (status !== 'public') {
            return res.status(400).json({ message: 'Invalid status provided.' });
        }

        const point = await Point.findByIdAndUpdate(pointId, { status }, { new: true });
        if (!point) {
            return res.status(404).json({ message: 'Point not found.' });
        }
        res.json({ message: 'Point approved successfully!', point });
    } catch (err) {
        console.error('Error updating point status:', err);
        res.status(500).json({ message: 'Error updating point status.' });
    }
});

// Owner panel API - check owner status
app.get('/api/owner/check', (req, res) => {
    const sessionCode = req.headers['x-session-code'];
    if (sessionCode === process.env.OWNER_SESSION_CODE) {
        res.json({ isOwner: true });
    } else {
        res.json({ isOwner: false });
    }
});

// Owner panel API - add new allowed session
app.post('/api/owner/sessions', isOwner, async (req, res) => {
    const { sessionCode } = req.body;
    if (!sessionCode) {
        return res.status(400).json({ message: 'Session code is required.' });
    }
    try {
        const existingSession = await AllowedSession.findOne({ sessionCode });
        if (existingSession) {
            return res.status(409).json({ message: 'Session code already exists.' });
        }
        await AllowedSession.create({ sessionCode });
        res.json({ message: 'Session code added successfully.' });
    } catch (err) {
        console.error('Error adding new session:', err);
        res.status(500).json({ message: 'Error adding session.' });
    }
});

// Owner panel API - get all allowed sessions
app.get('/api/owner/sessions', isOwner, async (req, res) => {
    try {
        const sessions = await AllowedSession.find({});
        res.json(sessions);
    } catch (err) {
        console.error('Error fetching allowed sessions:', err);
        res.status(500).json({ message: 'Error fetching sessions.' });
    }
});

// Owner panel API - delete allowed session
app.delete('/api/owner/sessions/:sessionCode', isOwner, async (req, res) => {
    const { sessionCode } = req.params;
    try {
        const result = await AllowedSession.deleteOne({ sessionCode });
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Session not found.' });
        }
        res.json({ message: 'Session deleted successfully.' });
    } catch (err) {
        console.error('Error deleting session:', err);
        res.status(500).json({ message: 'Error deleting session.' });
    }
});

// --- USER-FACING ROUTES ---
// Get public points
app.get('/api/points', async (req, res) => {
    try {
        const publicPoints = await Point.find({ status: 'public' });
        res.json(publicPoints);
    } catch (err) {
        console.error('Error fetching public points:', err);
        res.status(500).json({ message: 'Error fetching public points.' });
    }
});

// Get private and pending points for a specific session code
app.get('/api/points/private', async (req, res) => {
    const sessionCode = req.headers['x-session-code'];
    if (!sessionCode) {
        return res.status(400).json({ message: 'Session code is required.' });
    }
    try {
        const privatePoints = await Point.find({ ownerSessionCode: sessionCode });
        res.json(privatePoints);
    } catch (err) {
        console.error('Error fetching private points:', err);
        res.status(500).json({ message: 'Error fetching private points.' });
    }
});

// Add a new point
app.post('/api/points', async (req, res) => {
    try {
        const sessionCode = req.headers['x-session-code'];
        if (!sessionCode) {
            return res.status(400).json({ message: 'Session code is required.' });
        }
        const newPoint = new Point({ ...req.body, ownerSessionCode: sessionCode });
        await newPoint.save();
        res.status(201).json({ message: 'Point created successfully!', point: newPoint });
    } catch (err) {
        console.error('Error creating point:', err);
        res.status(400).json({ message: err.message });
    }
});

// Edit a point
app.put('/api/points/:id', async (req, res) => {
    try {
        const sessionCode = req.headers['x-session-code'];
        const pointId = req.params.id;
        
        const existingPoint = await Point.findById(pointId);
        if (!existingPoint) {
            return res.status(404).json({ message: 'Point not found.' });
        }
        
        if (existingPoint.ownerSessionCode !== sessionCode) {
            return res.status(403).json({ message: 'Forbidden: You do not own this point.' });
        }

        const updatedPoint = await Point.findByIdAndUpdate(pointId, req.body, { new: true });
        res.json({ message: 'Point updated successfully!', point: updatedPoint });
    } catch (err) {
        console.error('Error updating point:', err);
        res.status(400).json({ message: err.message });
    }
});

// Share a point
app.patch('/api/points/share/:id', async (req, res) => {
    try {
        const sessionCode = req.headers['x-session-code'];
        const pointId = req.params.id;
        
        const pointToShare = await Point.findById(pointId);
        if (!pointToShare) {
            return res.status(404).json({ message: 'Point not found.' });
        }
        if (pointToShare.ownerSessionCode !== sessionCode) {
            return res.status(403).json({ message: 'Forbidden: You do not own this point.' });
        }
        
        await Point.findByIdAndUpdate(pointId, { status: 'pending' });
        res.json({ message: 'Point is now pending for approval.' });
    } catch (err) {
        console.error('Error sharing point:', err);
        res.status(500).json({ message: 'Failed to share point.' });
    }
});

// Unshare a point
app.patch('/api/points/unshare/:id', async (req, res) => {
    try {
        const sessionCode = req.headers['x-session-code'];
        const pointId = req.params.id;
        
        const pointToUnshare = await Point.findById(pointId);
        if (!pointToUnshare) {
            return res.status(404).json({ message: 'Point not found.' });
        }
        if (pointToUnshare.ownerSessionCode !== sessionCode) {
            return res.status(403).json({ message: 'Forbidden: You do not own this point.' });
        }
        
        await Point.findByIdAndUpdate(pointId, { status: 'private' });
        res.json({ message: 'Point unshared successfully.' });
    } catch (err) {
        console.error('Error unsharing point:', err);
        res.status(500).json({ message: 'Failed to unshare point.' });
    }
});

// Delete a point
app.delete('/api/points/:id', async (req, res) => {
    try {
        const sessionCode = req.headers['x-session-code'];
        const pointId = req.params.id;
        const result = await Point.deleteOne({ _id: pointId, ownerSessionCode: sessionCode });
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Point not found or you do not have permission to delete it.' });
        }
        res.json({ message: 'Point deleted successfully.' });
    } catch (err) {
        console.error('Error deleting point:', err);
        res.status(500).json({ message: 'Error deleting point.' });
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
    });
};

startServer();
