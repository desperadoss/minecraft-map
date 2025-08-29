const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

require('dotenv').config();

const app = express();
const router = express.Router();
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
const Point = mongoose.model('Point', pointSchema);

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

// NEW: Owner Schema & Model
const ownerSchema = new mongoose.Schema({
    sessionCode: {
        type: String,
        unique: true,
        required: true
    }
}, {
    timestamps: true
});
const Owner = mongoose.model('Owner', ownerSchema);

// Middleware to check admin permissions
const adminMiddleware = async (req, res, next) => {
    try {
        const sessionCode = req.header('X-Session-Code');
        if (!sessionCode) {
            return res.status(401).json({ message: 'Missing session code.' });
        }
        
        // Owner always has admin permissions
        const isOwner = await Owner.findOne({ sessionCode });
        if (isOwner) {
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

// NEW: Middleware to check owner permissions
const ownerMiddleware = async (req, res, next) => {
    try {
        const sessionCode = req.header('X-Session-Code');
        if (!sessionCode) {
            return res.status(401).json({ message: 'Missing session code.' });
        }
        const owner = await Owner.findOne({ sessionCode });
        if (owner) {
            req.isOwner = true;
            return next();
        }
        return res.status(403).json({ message: 'Owner permissions required.' });
    } catch (err) {
        console.error('Error checking owner permissions:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};

// === API ENDPOINTS ===
const apiRouter = express.Router();

// Health check
apiRouter.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// GET - Fetch all public points
apiRouter.get('/points', async (req, res) => {
    try {
        const publicPoints = await Point.find({ status: 'public' });
        res.json(publicPoints);
    } catch (err) {
        console.error('Error fetching public points:', err);
        res.status(500).json({ message: 'Error fetching points.' });
    }
});

// GET - Fetch private points for a session
apiRouter.get('/points/private', async (req, res) => {
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
apiRouter.post('/points', async (req, res) => {
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

        const newPoint = new Point({ name: name.trim(), description, x: numX, z: numZ, ownerSessionCode, status: 'private', resourceType: resourceType || 'custom' });
        await newPoint.save();
        res.status(201).json(newPoint);
    } catch (err) {
        console.error('Error adding point:', err);
        res.status(500).json({ message: 'Error adding point.' });
    }
});

// PUT - Edit point (owner only)
apiRouter.put('/points/:id', async (req, res) => {
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
apiRouter.put('/points/share/:id', async (req, res) => {
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

        if (point.status !== 'private') {
            return res.status(400).json({ message: 'Only private points can be shared.' });
        }

        point.status = 'pending';
        await point.save();
        res.json({ message: 'Point submitted for admin approval.' });
    } catch (err) {
        console.error('Error sharing point:', err);
        res.status(500).json({ message: 'Error sharing point.' });
    }
});

// DELETE - Delete a point (owner only)
apiRouter.delete('/points/:id', async (req, res) => {
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

        await Point.deleteOne({ _id: id });
        res.json({ message: 'Point deleted successfully.' });
    } catch (err) {
        console.error('Error deleting point:', err);
        res.status(500).json({ message: 'Error deleting point.' });
    }
});

// === Admin Panel Routes ===
apiRouter.get('/admin/pending', adminMiddleware, async (req, res) => {
    try {
        const pendingPoints = await Point.find({ status: 'pending' });
        res.json(pendingPoints);
    } catch (err) {
        console.error('Error fetching pending points:', err);
        res.status(500).json({ message: 'Error fetching pending points.' });
    }
});

apiRouter.post('/admin/approve/:id', adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const point = await Point.findById(id);
        
        if (!point) {
            return res.status(404).json({ message: 'Point not found.' });
        }
        
        point.status = 'public';
        await point.save();
        res.json({ message: 'Point approved successfully.' });
    } catch (err) {
        console.error('Error approving point:', err);
        res.status(500).json({ message: 'Error approving point.' });
    }
});

apiRouter.post('/admin/reject/:id', adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const point = await Point.findById(id);
        
        if (!point) {
            return res.status(404).json({ message: 'Point not found.' });
        }

        await Point.deleteOne({ _id: id });
        res.json({ message: 'Point rejected and deleted.' });
    } catch (err) {
        console.error('Error rejecting point:', err);
        res.status(500).json({ message: 'Error rejecting point.' });
    }
});

// === Owner Panel Routes ===
apiRouter.post('/owner/login', async (req, res) => {
    try {
        const { sessionCode } = req.body;
        const isOwner = await Owner.findOne({ sessionCode });
        if (isOwner) {
            res.status(200).json({ message: 'Owner login successful.' });
        } else {
            res.status(401).json({ message: 'Invalid owner code.' });
        }
    } catch (err) {
        console.error('Owner login error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
});

apiRouter.post('/owner/promote', ownerMiddleware, async (req, res) => {
    try {
        const { sessionCode: codeToPromote } = req.body;
        if (!codeToPromote) {
            return res.status(400).json({ message: 'Session code is required.' });
        }
        
        const existingAdmin = await Admin.findOne({ sessionCode: codeToPromote });
        if (existingAdmin) {
            return res.status(409).json({ message: 'User is already an admin.' });
        }
        
        const newAdmin = new Admin({ sessionCode: codeToPromote });
        await newAdmin.save();
        res.status(201).json({ message: 'User promoted to admin successfully.' });
    } catch (err) {
        console.error('Error promoting user:', err);
        res.status(500).json({ message: 'Error promoting user.' });
    }
});

// NEW: Add a new owner session code
apiRouter.post('/owner/owners', ownerMiddleware, async (req, res) => {
    try {
        const { sessionCode: newOwnerCode } = req.body;
        if (!newOwnerCode) {
            return res.status(400).json({ message: 'Session code is required.' });
        }

        const existingOwner = await Owner.findOne({ sessionCode: newOwnerCode });
        if (existingOwner) {
            return res.status(409).json({ message: 'Session code is already an owner.' });
        }

        const newOwner = new Owner({ sessionCode: newOwnerCode });
        await newOwner.save();
        res.status(201).json({ message: 'New owner added successfully.' });
    } catch (err) {
        console.error('Error adding new owner:', err);
        res.status(500).json({ message: 'Error adding new owner.' });
    }
});

apiRouter.get('/owner/sessions', ownerMiddleware, async (req, res) => {
    try {
        const sessions = await AllowedSession.find({});
        res.json(sessions);
    } catch (err) {
        console.error('Error fetching allowed sessions:', err);
        res.status(500).json({ message: 'Error fetching allowed sessions.' });
    }
});

apiRouter.post('/owner/sessions', ownerMiddleware, async (req, res) => {
    try {
        const { sessionCode } = req.body;
        const addedBy = req.header('X-Session-Code');
        if (!sessionCode) {
            return res.status(400).json({ message: 'Session code is required.' });
        }
        
        const existingSession = await AllowedSession.findOne({ sessionCode });
        if (existingSession) {
            return res.status(409).json({ message: 'This session code is already allowed.' });
        }
        
        const newAllowedSession = new AllowedSession({ sessionCode, addedBy });
        await newAllowedSession.save();
        res.status(201).json({ message: 'Session added to allowed list successfully.' });
    } catch (err) {
        console.error('Error adding allowed session:', err);
        res.status(500).json({ message: 'Error adding allowed session.' });
    }
});

apiRouter.delete('/owner/sessions/:code', ownerMiddleware, async (req, res) => {
    try {
        const { code } = req.params;
        const result = await AllowedSession.deleteOne({ sessionCode: code });
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Session not found.' });
        }
        res.json({ message: 'Session deleted successfully.' });
    } catch (err) {
        console.error('Error deleting session:', err);
        res.status(500).json({ message: 'Error deleting session.' });
    }
});

apiRouter.post('/owner/demote', ownerMiddleware, async (req, res) => {
    try {
        const { sessionCode: codeToDemote } = req.body;
        if (!codeToDemote) {
            return res.status(400).json({ message: 'Session code is required.' });
        }
        
        // Prevent demoting self if you are the only owner (optional, but good practice)
        // const isOwner = await Owner.findOne({ sessionCode: req.header('X-Session-Code') });
        // if (isOwner && codeToDemote === req.header('X-Session-Code')) {
        //     return res.status(400).json({ message: 'Cannot demote yourself.' });
        // }
        
        const result = await Admin.deleteOne({ sessionCode: codeToDemote });
        if (result.deletedCount === 0) {
            return res.json({ message: 'User was not an admin.' });
        }
        res.json({ message: 'User demoted.' });
    } catch (err) {
        console.error('Error demoting user:', err);
        res.status(500).json({ message: 'Error demoting user.' });
    }
});

// Middleware to check if user is owner
apiRouter.get('/owner/check', async (req, res) => {
    try {
        const sessionCode = req.header('X-Session-Code');
        if (!sessionCode) {
            return res.status(401).json({ isOwner: false, message: 'Missing session code.' });
        }
        const owner = await Owner.findOne({ sessionCode });
        if (owner) {
            res.json({ isOwner: true });
        } else {
            res.json({ isOwner: false });
        }
    } catch (err) {
        console.error('Error checking owner status:', err);
        res.status(500).json({ isOwner: false, message: 'Server error.' });
    }
});


// Use the router
app.use('/api', apiRouter);


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
    
    // Check for at least one owner, create a default if none exist
    const ownerCount = await Owner.countDocuments({});
    if (ownerCount === 0) {
        const newOwnerCode = uuidv4();
        const initialOwner = new Owner({ sessionCode: newOwnerCode });
        await initialOwner.save();
        console.log(`Initial owner created with code: ${newOwnerCode}`);
        console.log('Use this code to log in as owner. Save it securely!');
    }

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`URL: http://localhost:${PORT}`);
    });
};

startServer();
