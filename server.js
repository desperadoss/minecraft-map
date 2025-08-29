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

const allowedSessionSchema = new mongoose.Schema({
    sessionCode: {
        type: String,
        unique: true,
        required: true
    }
}, {
    timestamps: true
});

const Admin = mongoose.model('Admin', allowedSessionSchema);
const AllowedSession = mongoose.model('AllowedSession', allowedSessionSchema);
const Point = mongoose.model('Point', pointSchema);

// Fixed owner session code
const OWNER_SESSION_CODE = "301263ee-49a9-4575-8c3d-f784bae7b27d";

// === Middleware ===
const isOwner = async (req, res, next) => {
    const sessionCode = req.header('X-Session-Code');
    if (!sessionCode) {
        return res.status(400).json({ message: 'Session code is required in header.' });
    }
    if (sessionCode !== OWNER_SESSION_CODE) {
        return res.status(403).json({ message: 'Access denied. Only owners can perform this action.' });
    }
    req.isOwner = true;
    next();
};

const isAdmin = async (req, res, next) => {
    const sessionCode = req.header('X-Session-Code');
    if (!sessionCode) {
        return res.status(400).json({ message: 'Session code is required in header.' });
    }
    
    if (sessionCode === OWNER_SESSION_CODE) {
        req.isAdmin = true;
        return next();
    }
    
    const adminSession = await Admin.findOne({ sessionCode });
    if (adminSession) {
        req.isAdmin = true;
        return next();
    }
    
    res.status(403).json({ message: 'Access denied. Only admins can perform this action.' });
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
            description,
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
// POST - Admin login
app.post('/api/admin/login', async (req, res) => {
    try {
        const sessionCode = req.header('X-Session-Code');
        if (!sessionCode) {
            return res.status(400).json({ message: 'Session code is required in header.' });
        }
        
        // Owner always has admin permissions
        if (sessionCode === OWNER_SESSION_CODE) {
            return res.status(200).json({ message: 'Admin login successful.' });
        }
        
        const adminSession = await Admin.findOne({ sessionCode });
        if (adminSession) {
            return res.status(200).json({ message: 'Admin login successful.' });
        }
        
        res.status(401).json({ message: 'Invalid session code.' });
    } catch (err) {
        console.error('Error during admin login:', err);
        res.status(500).json({ message: 'Server error.' });
    }
});

// GET - Fetch pending points for admin approval
app.get('/api/admin/pending', isAdmin, async (req, res) => {
    try {
        const pendingPoints = await Point.find({ status: 'pending' });
        res.json(pendingPoints);
    } catch (err) {
        console.error('Error fetching pending points:', err);
        res.status(500).json({ message: 'Error fetching points.' });
    }
});

// PUT - Approve a point
app.put('/api/admin/approve/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const point = await Point.findByIdAndUpdate(id, { status: 'public' }, { new: true });
        
        if (!point) {
            return res.status(404).json({ message: 'Point not found.' });
        }
        
        res.json({ message: 'Point approved!', point });
    } catch (err) {
        console.error('Error approving point:', err);
        res.status(500).json({ message: 'Error approving point.' });
    }
});

// PUT - Decline a point (revert to private)
app.put('/api/admin/decline/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const point = await Point.findByIdAndUpdate(id, { status: 'private' }, { new: true });
        
        if (!point) {
            return res.status(404).json({ message: 'Point not found.' });
        }
        
        res.json({ message: 'Point declined!', point });
    } catch (err) {
        console.error('Error declining point:', err);
        res.status(500).json({ message: 'Error declining point.' });
    }
});

// === OWNER ENDPOINTS ===
// GET - Check if user is owner
app.get('/api/owner/check', (req, res) => {
    const sessionCode = req.header('X-Session-Code');
    res.json({ isOwner: sessionCode === OWNER_SESSION_CODE });
});

// GET - Fetch all allowed sessions
app.get('/api/owner/sessions', isOwner, async (req, res) => {
    try {
        const sessions = await AllowedSession.find({});
        res.json(sessions);
    } catch (err) {
        console.error('Error fetching allowed sessions:', err);
        res.status(500).json({ message: 'Server error.' });
    }
});

// POST - Add a new allowed session
app.post('/api/owner/sessions', isOwner, async (req, res) => {
    const { sessionCode } = req.body;
    if (!sessionCode) {
        return res.status(400).json({ message: 'Session code is required.' });
    }
    
    try {
        const existingSession = await AllowedSession.findOne({ sessionCode });
        if (existingSession) {
            return res.status(409).json({ message: 'This session code is already on the list.' });
        }
        const newSession = new AllowedSession({ sessionCode });
        await newSession.save();
        res.status(201).json({ message: 'Session added successfully.' });
    } catch (err) {
        console.error('Error adding session:', err);
        res.status(500).json({ message: 'Server error.' });
    }
});

// DELETE - Remove an allowed session
app.delete('/api/owner/sessions/:code', isOwner, async (req, res) => {
    const { code } = req.params;
    try {
        const result = await AllowedSession.deleteOne({ sessionCode: code });
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Session not found.' });
        }
        res.json({ message: 'Session removed successfully.' });
    } catch (err) {
        console.error('Error removing session:', err);
        res.status(500).json({ message: 'Server error.' });
    }
});

// === Server startup ===
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}).catch(err => {
    console.error('Failed to connect to the database:', err);
});
