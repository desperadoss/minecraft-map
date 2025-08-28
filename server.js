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

// Serve static files from the root of the project
app.use(express.static(path.join(__dirname)));
// Optionally serve a public folder if one exists
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

// Schema and model for map points - UPDATED with 'description'
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
        required: true
    },
    status: {
        type: String,
        enum: ['private', 'pending', 'public'],
        default: 'private'
    },
    resourceType: {
        type: String,
        default: 'custom',
        trim: true
    }
}, {
    timestamps: true
});

const Point = mongoose.model('Point', pointSchema);

// Schema and model for admin permissions
const adminSchema = new mongoose.Schema({
    sessionCode: {
        type: String,
        unique: true,
        required: true
    }
}, {
    timestamps: true
});

const Admin = mongoose.model('Admin', adminSchema);

// Schema for allowed session codes for admin login
const allowedSessionSchema = new mongoose.Schema({
    sessionCode: {
        type: String,
        unique: true,
        required: true
    },
    addedBy: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

const AllowedSession = mongoose.model('AllowedSession', allowedSessionSchema);

// Fixed owner session code
const OWNER_SESSION_CODE = "301263ee-49a9-4575-8c3d-f784bae7b27d";

// Middleware to check admin permissions
const checkAdmin = async (req, res, next) => {
    try {
        const sessionCode = req.header('X-Session-Code');
        if (!sessionCode) {
            return res.status(401).json({ message: 'Missing session code.' });
        }
        
        if (sessionCode === OWNER_SESSION_CODE) {
            req.isAdmin = true;
            req.isOwner = true;
            return next();
        }
        
        const admin = await Admin.findOne({ sessionCode });
        if (admin) {
            req.isAdmin = true;
            return next();
        }
        
        return res.status(403).json({ message: 'Admin permissions required.' });
    } catch (err) {
        console.error('Error checking permissions:', err);
        return res.status(500).json({ message: 'Server error.' });
    }
};

// Middleware to check owner permissions
const checkOwner = (req, res, next) => {
    const sessionCode = req.header('X-Session-Code');
    if (sessionCode !== OWNER_SESSION_CODE) {
        return res.status(403).json({ message: 'Owner permissions required.' });
    }
    req.isOwner = true;
    next();
};

// === API ENDPOINTS ===

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// GET - Fetch all public points
app.get('/api/points', async (req, res) => {
    try {
        const publicPoints = await Point.find({ status: 'public' });
        res.json(publicPoints);
    } catch (err) {
        console.error('Error fetching public points:', err);
        res.status(500).json({ message: 'Error fetching points.' });
    }
});

// GET - Fetch private points for a session
app.get('/api/points/private', async (req, res) => {
    try {
        const sessionCode = req.header('X-Session-Code');
        if (!sessionCode) {
            return res.status(401).json({ message: 'Missing session code.' });
        }
        const privatePoints = await Point.find({ ownerSessionCode: sessionCode });
        res.json(privatePoints);
    } catch (err) {
        console.error('Error fetching private points:', err);
        res.status(500).json({ message: 'Error fetching points.' });
    }
});

// Function to check if a session code has admin/owner privileges
const checkAdminAuth = async (req, res, next) => {
    const sessionCode = req.header('X-Session-Code');
    if (!sessionCode) {
        return res.status(401).json({ message: 'No session code provided.' });
    }
    const session = await Session.findOne({ code: sessionCode });
    if (!session || !session.isAdmin) {
        return res.status(403).json({ message: 'Forbidden. Admin privileges required.' });
    }
    req.session = session;
    next();
};

// API route to get all allowed session codes (for the owner panel)
app.get('/api/owner/allowed-sessions', checkAdminAuth, async (req, res) => {
    try {
        const sessions = await Session.find({}).sort({ createdAt: -1 });
        res.json(sessions);
    } catch (err) {
        console.error('Error fetching allowed sessions:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// API route to add a new session code to the allowed list (owner only)
app.post('/api/owner/add-session', checkAdminAuth, async (req, res) => {
    const { code } = req.body;
    if (!code) {
        return res.status(400).json({ message: 'Session code is required.' });
    }

    try {
        let session = await Session.findOne({ code });
        if (session) {
            return res.status(409).json({ message: 'Session code already exists.' });
        }
        session = new Session({ code, isAdmin: false });
        await session.save();
        res.status(201).json({ message: 'Session added successfully.' });
    } catch (err) {
        console.error('Error adding session code:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// API route to promote a user to admin (owner only)
app.post('/api/owner/promote', checkAdminAuth, async (req, res) => {
    const { sessionCode } = req.body;
    if (!sessionCode) {
        return res.status(400).json({ message: 'Session code is required for promotion.' });
    }

    try {
        const userSession = await Session.findOneAndUpdate(
            { code: sessionCode },
            { isAdmin: true },
            { new: true }
        );

        if (!userSession) {
            return res.status(404).json({ message: 'Session code not found.' });
        }

        res.json({ message: `Session code ${userSession.code} promoted to admin successfully.` });
    } catch (err) {
        console.error('Error promoting session:', err);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

// API route to remove a session code (owner only)
app.delete('/api/owner/remove-session', checkAdminAuth, async (req, res) => {
    const { code } = req.body;

    try {
        const result = await Session.deleteOne({ code });
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Session code not found.' });
        }
        res.json({ message: `Session code ${code} removed successfully.` });
    } catch (err) {
        console.error('Error removing session:', err);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

// POST - Add new point (default status: private)
app.post('/api/points', async (req, res) => {
    try {
        const { name, description, x, z, resourceType } = req.body;
        const ownerSessionCode = req.header('X-Session-Code');

        if (!name || name.trim() === '') {
            return res.status(400).json({ message: 'Point name is required.' });
        }

        if (x === undefined || z === undefined) {
            return res.status(400).json({ message: 'X and Z coordinates are required.' });
        }

        if (!ownerSessionCode) {
            return res.status(400).json({ message: 'Session code is required.' });
        }

        const numX = parseInt(x);
        const numZ = parseInt(z);

        if (isNaN(numX) || isNaN(numZ)) {
            return res.status(400).json({ message: 'Coordinates must be numbers.' });
        }

        const newPoint = new Point({ 
            name: name.trim(),
            description: description,
            x: numX, 
            z: numZ, 
            ownerSessionCode, 
            status: 'private',
            resourceType: resourceType || 'custom'
        });
        
        await newPoint.save();
        res.status(201).json(newPoint);
    } catch (err) {
        console.error('Error adding point:', err);
        res.status(500).json({ message: 'Error adding point.' });
    }
});

// PUT - Edit point (owner only)
app.put('/api/points/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, x, z, resourceType } = req.body;
        const sessionCode = req.header('X-Session-Code');

        if (!name || name.trim() === '') {
            return res.status(400).json({ message: 'Point name is required.' });
        }

        if (x === undefined || z === undefined) {
            return res.status(400).json({ message: 'X and Z coordinates are required.' });
        }

        const numX = parseInt(x);
        const numZ = parseInt(z);

        if (isNaN(numX) || isNaN(numZ)) {
            return res.status(400).json({ message: 'Coordinates must be numbers.' });
        }

        const point = await Point.findById(id);
        if (!point) {
            return res.status(404).json({ message: 'Point not found.' });
        }

        if (point.ownerSessionCode !== sessionCode) {
            return res.status(403).json({ message: 'No permission to edit this point.' });
        }

        point.name = name.trim();
        point.description = description;
        point.x = numX;
        point.z = numZ;
        point.resourceType = resourceType || 'custom';
        await point.save();
        res.json(point);
    } catch (err) {
        console.error('Error editing point:', err);
        res.status(500).json({ message: 'Error editing point.' });
    }
});

// PUT - Share point for admin approval
app.put('/api/points/share/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const sessionCode = req.header('X-Session-Code');
        const point = await Point.findById(id);
        if (!point) {
            return res.status(404).json({ message: 'Point not found.' });
        }

        if (point.ownerSessionCode !== sessionCode) {
            return res.status(403).json({ message: 'No permission to share this point.' });
        }

        if (point.status === 'pending') {
            return res.status(400).json({ message: 'Point is already pending approval.' });
        }

        if (point.status === 'public') {
            return res.status(400).json({ message: 'Point is already public.' });
        }

        point.status = 'pending';
        await point.save();
        res.json(point);
    } catch (err) {
        console.error('Error sharing point:', err);
        res.status(500).json({ message: 'Error sharing point.' });
    }
});

// DELETE - Delete point (owner only)
app.delete('/api/points/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const sessionCode = req.header('X-Session-Code');
        const point = await Point.findById(id);
        if (!point) {
            return res.status(404).json({ message: 'Point not found.' });
        }
        if (point.ownerSessionCode !== sessionCode) {
            return res.status(403).json({ message: 'No permission to delete this point.' });
        }
        await Point.findByIdAndDelete(id);
        res.json({ message: 'Point deleted.' });
    } catch (err) {
        console.error('Error deleting point:', err);
        res.status(500).json({ message: 'Error deleting point.' });
    }
});

// === ADMIN ENDPOINTS ===

// POST - Admin login - with allowed sessions check
app.post('/api/admin/login', async (req, res) => {
    try {
        const { sessionCode } = req.body;
        if (!sessionCode) {
            return res.status(400).json({ message: 'Session code is required.' });
        }

        const allowedSession = await AllowedSession.findOne({ sessionCode });
        if (!allowedSession) {
            return res.status(401).json({ message: 'Session code not allowed for admin login.' });
        }

        const admin = new Admin({ sessionCode });
        await admin.save();
        res.status(200).json({ message: 'Admin login successful.', sessionCode });
    } catch (err) {
        console.error('Error during admin login:', err);
        res.status(500).json({ message: 'Error during admin login.' });
    }
});

// GET - Get list of pending points (admin only)
app.get('/api/admin/pending', checkAdmin, async (req, res) => {
    try {
        const pendingPoints = await Point.find({ status: 'pending' });
        res.json(pendingPoints);
    } catch (err) {
        console.error('Error fetching pending points:', err);
        res.status(500).json({ message: 'Error fetching pending points.' });
    }
});

// PUT - Approve pending point (admin only)
app.put('/api/admin/approve/:id', checkAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const point = await Point.findById(id);

        if (!point) {
            return res.status(404).json({ message: 'Point not found.' });
        }

        if (point.status !== 'pending') {
            return res.status(400).json({ message: 'Point is not pending approval.' });
        }
        
        point.status = 'public';
        await point.save();
        res.json(point);
    } catch (err) {
        console.error('Error approving point:', err);
        res.status(500).json({ message: 'Error approving point.' });
    }
});

// DELETE - Reject/delete pending point (admin only)
app.delete('/api/admin/reject/:id', checkAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const point = await Point.findById(id);

        if (!point) {
            return res.status(404).json({ message: 'Point not found.' });
        }

        if (point.status !== 'pending') {
            return res.status(400).json({ message: 'Point is not pending deletion.' });
        }
        
        await Point.findByIdAndDelete(id);
        res.json({ message: 'Point rejected and deleted.' });
    } catch (err) {
        console.error('Error rejecting point:', err);
        res.status(500).json({ message: 'Error rejecting point.' });
    }
});

// GET - Check if user is owner
app.get('/api/owner/check', (req, res) => {
    const sessionCode = req.header('X-Session-Code');
    res.json({ isOwner: sessionCode === OWNER_SESSION_CODE });
});

// POST - Add an allowed session code (owner only)
app.post('/api/owner/sessions', checkOwner, async (req, res) => {
    try {
        const { sessionCode } = req.body;
        if (!sessionCode) {
            return res.status(400).json({ message: 'Session code is required.' });
        }

        const newAllowedSession = new AllowedSession({ sessionCode, addedBy: req.header('X-Session-Code') });
        await newAllowedSession.save();
        res.status(201).json({ message: 'Session code added successfully.' });
    } catch (err) {
        console.error('Error adding session:', err);
        res.status(500).json({ message: 'Error adding session code.' });
    }
});

// GET - Get all allowed sessions (owner only)
app.get('/api/owner/sessions', checkOwner, async (req, res) => {
    try {
        const allowedSessions = await AllowedSession.find({});
        res.json(allowedSessions);
    } catch (err) {
        console.error('Error fetching allowed sessions:', err);
        res.status(500).json({ message: 'Error fetching allowed sessions.' });
    }
});

// DELETE - Delete an allowed session (owner only)
app.delete('/api/owner/sessions/:sessionCode', checkOwner, async (req, res) => {
    try {
        const { sessionCode } = req.params;
        await AllowedSession.findOneAndDelete({ sessionCode });
        res.json({ message: 'Session code deleted successfully.' });
    } catch (err) {
        console.error('Error deleting session:', err);
        res.status(500).json({ message: 'Error deleting session code.' });
    }
});

// Catch-all route for SPA - must be at the end
app.get('*', (req, res) => {
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

