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

// Serowanie plików statycznych - poprawione ścieżki
app.use(express.static(path.join(__dirname)));
app.use(express.static(path.join(__dirname, 'public')));

// Połączenie z bazą danych MongoDB - usunięcie deprecated opcji
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Połączenie z bazą danych MongoDB udane!');
    } catch (err) {
        console.error('Błąd połączenia z bazą danych:', err);
        process.exit(1);
    }
};

// Schemat i model dla punktów na mapie
const pointSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
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
    }
}, {
    timestamps: true
});

const Point = mongoose.model('Point', pointSchema);

// Schemat i model dla uprawnień admina
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

// NOWY SCHEMAT: Dozwolone kody sesji do logowania jako admin
const allowedSessionSchema = new mongoose.Schema({
    sessionCode: {
        type: String,
        unique: true,
        required: true
    },
    addedBy: {
        type: String,
        required: true // kod sesji ownera który dodał
    }
}, {
    timestamps: true
});

const AllowedSession = mongoose.model('AllowedSession', allowedSessionSchema);

// Stały kod sesji ownera
const OWNER_SESSION_CODE = "301263ee-49a9-4575-8c3d-f784bae7b27d";

// Middleware do sprawdzania uprawnień admina
const checkAdmin = async (req, res, next) => {
    try {
        const sessionCode = req.header('X-Session-Code');
        if (!sessionCode) {
            return res.status(401).json({ message: 'No session code.' });
        }
        
        // Sprawdź czy to owner
        if (sessionCode === OWNER_SESSION_CODE) {
            req.isAdmin = true;
            req.isOwner = true;
            return next();
        }
        
        // Sprawdź czy to admin z bazy
        const admin = await Admin.findOne({ sessionCode });
        if (admin) {
            req.isAdmin = true;
            return next();
        }
        
        return res.status(403).json({ message: 'No admin privileges.' });
    } catch (err) {
        console.error('Permission check error:', err);
        return res.status(500).json({ message: 'Server error.' });
    }
};

// Middleware do sprawdzania uprawnień ownera
const checkOwner = (req, res, next) => {
    const sessionCode = req.header('X-Session-Code');
    if (sessionCode !== OWNER_SESSION_CODE) {
        return res.status(403).json({ message: 'No owner privileges.' });
    }
    req.isOwner = true;
    next();
};

// === ENDPOINTY API ===

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// GET - Pobieranie wszystkich punktów publicznych
app.get('/api/points', async (req, res) => {
    try {
        const publicPoints = await Point.find({ status: 'public' });
        res.json(publicPoints);
    } catch (err) {
        console.error('Error downloading public points:', err);
        res.status(500).json({ message: 'Point collection error.' });
    }
});

// GET - Pobieranie punktów prywatnych dla danej sesji
app.get('/api/points/private', async (req, res) => {
    try {
        const sessionCode = req.header('X-Session-Code');
        if (!sessionCode) {
            return res.status(401).json({ message: 'No session code.' });
        }
        const privatePoints = await Point.find({ ownerSessionCode: sessionCode });
        res.json(privatePoints);
    } catch (err) {
        console.error('Error retrieving private points:', err);
        res.status(500).json({ message: 'Point collection error.' });
    }
});

// POST - Dodawanie nowego punktu (domyślnie status: private)
app.post('/api/points', async (req, res) => {
    try {
        const { name, x, z } = req.body;
        const ownerSessionCode = req.header('X-Session-Code');

        if (!name || name.trim() === '') {
            return res.status(400).json({ message: 'The name of the point is required..' });
        }

        if (x === undefined || z === undefined) {
            return res.status(400).json({ message: 'X and Z coordinates are required.' });
        }

        if (!ownerSessionCode) {
            return res.status(400).json({ message: 'Session code required.' });
        }

        const numX = parseInt(x);
        const numZ = parseInt(z);

        if (isNaN(numX) || isNaN(numZ)) {
            return res.status(400).json({ message: 'The coordinates must be numbers..' });
        }

        const newPoint = new Point({ 
            name: name.trim(), 
            x: numX, 
            z: numZ, 
            ownerSessionCode, 
            status: 'private' 
        });
        
        await newPoint.save();
        res.status(201).json(newPoint);
    } catch (err) {
        console.error('Error adding point:', err);
        res.status(500).json({ message: 'Error adding point.' });
    }
});

// PUT - Edycja punktu (tylko właściciel)
app.put('/api/points/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, x, z } = req.body;
        const sessionCode = req.header('X-Session-Code');

        if (!name || name.trim() === '') {
            return res.status(400).json({ message: 'The name of the point is required..' });
        }

        if (x === undefined || z === undefined) {
            return res.status(400).json({ message: 'X and Z coordinates are required.' });
        }

        const numX = parseInt(x);
        const numZ = parseInt(z);

        if (isNaN(numX) || isNaN(numZ)) {
            return res.status(400).json({ message: 'The coordinates must be numbers..' });
        }

        const point = await Point.findById(id);
        if (!point) {
            return res.status(404).json({ message: 'Point not found.' });
        }

        if (point.ownerSessionCode !== sessionCode) {
            return res.status(403).json({ message: 'No permissions to edit this point.' });
        }

        point.name = name.trim();
        point.x = numX;
        point.z = numZ;
        await point.save();
        res.json(point);
    } catch (err) {
        console.error('Point editing error:', err);
        res.status(500).json({ message: 'Point editing error.' });
    }
});

// PUT - Udostępnianie punktu do akceptacji admina
app.put('/api/points/share/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const sessionCode = req.header('X-Session-Code');

        const point = await Point.findById(id);
        if (!point) {
            return res.status(404).json({ message: 'Point not found.' });
        }

        if (point.ownerSessionCode !== sessionCode) {
            return res.status(403).json({ message: 'No permission to share this item.' });
        }

        if (point.status === 'pending') {
            return res.status(400).json({ message: 'The point is already awaiting approval..' });
        }

        if (point.status === 'public') {
            return res.status(400).json({ message: 'The point is now public..' });
        }

        point.status = 'pending';
        await point.save();
        res.json(point);
    } catch (err) {
        console.error('Point sharing error:', err);
        res.status(500).json({ message: 'Point sharing error.' });
    }
});

// DELETE - Usuwanie punktu (tylko właściciel)
app.delete('/api/points/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const sessionCode = req.header('X-Session-Code');

        const point = await Point.findById(id);
        if (!point) {
            return res.status(404).json({ message: 'Point not found.' });
        }

        if (point.ownerSessionCode !== sessionCode) {
            return res.status(403).json({ message: 'No permission to delete this item.' });
        }

        await Point.findByIdAndDelete(id);
        res.json({ message: 'Point deleted.' });
    } catch (err) {
        console.error('Point deletion error:', err);
        res.status(500).json({ message: 'Point deletion error.' });
    }
});

// === ENDPOINTY ADMINA ===

// POST - Logowanie admina - ZAKTUALIZOWANE z sprawdzaniem dozwolonych sesji
app.post('/api/admin/login', async (req, res) => {
    try {
        const { adminCode } = req.body;
        const sessionCode = req.header('X-Session-Code');
        
        if (!sessionCode) {
            return res.status(400).json({ success: false, message: 'No session code.' });
        }
        
        if (!adminCode) {
            return res.status(400).json({ success: false, message: 'No admin code.' });
        }
        
        // Sprawdź czy to owner - może się logować zawsze
        if (sessionCode === OWNER_SESSION_CODE) {
            if (adminCode === process.env.ADMIN_CODE) {
                return res.json({ success: true, message: 'Logged in as owner' });
            } else {
                return res.status(401).json({ success: false, message: 'Incorrect admin code' });
            }
        }
        
        // Sprawdź czy kod sesji jest na liście dozwolonych
        const allowedSession = await AllowedSession.findOne({ sessionCode });
        if (!allowedSession) {
            return res.status(403).json({ 
                success: false, 
                message: 'Your session code is not authorized to log in as an admin..' 
            });
        }
        
        // Sprawdź czy kod admina jest poprawny
        if (adminCode === process.env.ADMIN_CODE) {
            try {
                const existingAdmin = await Admin.findOne({ sessionCode });
                if (!existingAdmin) {
                    const newAdmin = new Admin({ sessionCode });
                    await newAdmin.save();
                }
                res.json({ success: true, message: 'Logged in as admin' });
            } catch (err) {
                if (err.code === 11000) {
                    // Użytkownik już jest adminem
                    res.json({ success: true, message: 'Zalogowano jako admin' });
                } else {
                    console.error('Błąd zapisywania admina:', err);
                    res.status(500).json({ success: false, message: 'Server error' });
                }
            }
        } else {
            res.status(401).json({ success: false, message: 'Incorrect admin code' });
        }
    } catch (err) {
        console.error('Błąd logowania admina:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET - Pobieranie punktów do akceptacji (admin)
app.get('/api/admin/pending', checkAdmin, async (req, res) => {
    try {
        const pendingPoints = await Point.find({ status: 'pending' });
        res.json(pendingPoints);
    } catch (err) {
        console.error('Error downloading pending points:', err);
        res.status(500).json({ message: 'Error downloading pending points.' });
    }
});

// PUT - Akceptowanie punktu (admin)
app.put('/api/admin/accept/:id', checkAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const point = await Point.findById(id);
        if (!point) {
            return res.status(404).json({ message: 'Point not found.' });
        }
        if (point.status !== 'pending') {
            return res.status(400).json({ message: 'The point does not await acceptance.' });
        }
        point.status = 'public';
        await point.save();
        res.json(point);
    } catch (err) {
        console.error('Point acceptance error:', err);
        res.status(500).json({ message: 'Point acceptance error.' });
    }
});

// PUT - Odrzucenie punktu (zmiana z pending na private)
app.put('/api/admin/reject/:id', checkAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const point = await Point.findById(id);
        if (!point) {
            return res.status(404).json({ message: 'Point not found.' });
        }
        if (point.status !== 'pending') {
            return res.status(400).json({ message: 'The point does not await acceptance.' });
        }
        point.status = 'private';
        await point.save();
        res.json(point);
    } catch (err) {
        console.error('Błąd odrzucenia punktu:', err);
        res.status(500).json({ message: 'Point rejection error.' });
    }
});

// PUT - Edycja punktu publicznego (admin)
app.put('/api/admin/edit/:id', checkAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, x, z } = req.body;

        if (!name || name.trim() === '') {
            return res.status(400).json({ message: 'The name of the point is required..' });
        }

        if (x === undefined || z === undefined) {
            return res.status(400).json({ message: 'X and Z coordinates are required.' });
        }

        const numX = parseInt(x);
        const numZ = parseInt(z);

        if (isNaN(numX) || isNaN(numZ)) {
            return res.status(400).json({ message: 'The coordinates must be numbers..' });
        }

        const point = await Point.findById(id);
        if (!point) {
            return res.status(404).json({ message: 'Point not found.' });
        }
        point.name = name.trim();
        point.x = numX;
        point.z = numZ;
        await point.save();
        res.json(point);
    } catch (err) {
        console.error('Błąd edycji punktu przez admina:', err);
        res.status(500).json({ message: 'Point editing error.' });
    }
});

// DELETE - Usuwanie punktu (admin)
app.delete('/api/admin/delete/:id', checkAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const point = await Point.findById(id);
        if (!point) {
            return res.status(404).json({ message: 'Point not found.' });
        }
        await Point.findByIdAndDelete(id);
        res.json({ message: 'Point deleted.' });
    } catch (err) {
        console.error('Error removing a point by the admin:', err);
        res.status(500).json({ message: 'Point deletion error.' });
    }
});

// === ENDPOINTY OWNERA ===

// GET - Sprawdzanie czy użytkownik jest ownerem
app.get('/api/owner/check', (req, res) => {
    const sessionCode = req.header('X-Session-Code');
    if (sessionCode === OWNER_SESSION_CODE) {
        res.json({ isOwner: true });
    } else {
        res.json({ isOwner: false });
    }
});

// GET - Pobieranie listy dozwolonych kodów sesji (owner)
app.get('/api/owner/allowed-sessions', checkOwner, async (req, res) => {
    try {
        const allowedSessions = await AllowedSession.find().sort({ createdAt: -1 });
        res.json(allowedSessions);
    } catch (err) {
        console.error('Error downloading authorized sessions:', err);
        res.status(500).json({ message: 'Error retrieving list.' });
    }
});

// POST - Dodawanie dozwolonego kodu sesji (owner)
app.post('/api/owner/allow-session', checkOwner, async (req, res) => {
    try {
        const { sessionCode: newSessionCode } = req.body;
        const ownerSessionCode = req.header('X-Session-Code');

        if (!newSessionCode || newSessionCode.trim() === '') {
            return res.status(400).json({ message: 'Session code required.' });
        }

        const trimmedSessionCode = newSessionCode.trim();

        // Sprawdź czy już istnieje
        const existing = await AllowedSession.findOne({ sessionCode: trimmedSessionCode });
        if (existing) {
            return res.status(400).json({ message: 'This session code is already on the list of allowed codes..' });
        }

        const newAllowedSession = new AllowedSession({
            sessionCode: trimmedSessionCode,
            addedBy: ownerSessionCode
        });

        await newAllowedSession.save();
        res.status(201).json({ 
            message: 'Session code added to the list of allowed codes.',
            session: newAllowedSession
        });
    } catch (err) {
        console.error('Error adding allowed session code:', err);
        res.status(500).json({ message: 'Error adding session code.' });
    }
});

// DELETE - Usuwanie dozwolonego kodu sesji (owner)
app.delete('/api/owner/remove-session', checkOwner, async (req, res) => {
    try {
        const { sessionCode: sessionToRemove } = req.body;

        if (!sessionToRemove) {
            return res.status(400).json({ message: 'The session code to be deleted is required..' });
        }

        const result = await AllowedSession.deleteOne({ sessionCode: sessionToRemove });
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'The session code was not found in the list..' });
        }

        // Usuń także z listy adminów jeśli tam jest
        await Admin.deleteOne({ sessionCode: sessionToRemove });

        res.json({ message: 'Session code removed from the list of allowed codes.' });
    } catch (err) {
        console.error('Error deleting allowed session code:', err);
        res.status(500).json({ message: 'Session code deletion error.' });
    }
});

// PUT - Awansowanie użytkownika na admina (owner) - ZAKTUALIZOWANE
app.put('/api/owner/promote', checkOwner, async (req, res) => {
    try {
        const { sessionCode: codeToPromote } = req.body;

        if (!codeToPromote) {
            return res.status(400).json({ message: 'The session code for promotion is required..' });
        }

        // Sprawdź czy kod sesji jest na liście dozwolonych
        const allowedSession = await AllowedSession.findOne({ sessionCode: codeToPromote });
        if (!allowedSession) {
            return res.status(400).json({ 
                message: 'This session code is not on the list of allowed codes. Please add it to the list of allowed sessions first..' 
            });
        }

        const existingAdmin = await Admin.findOne({ sessionCode: codeToPromote });
        if (existingAdmin) {
            return res.json({ message: 'The user is already an admin..' });
        }
        
        const newAdmin = new Admin({ sessionCode: codeToPromote });
        await newAdmin.save();
        res.json({ message: 'User promoted to admin.' });
    } catch (err) {
        console.error('User promotion error:', err);
        res.status(500).json({ message: 'User promotion error.' });
    }
});

// DELETE - Usunięcie admina (owner)
app.delete('/api/owner/demote', checkOwner, async (req, res) => {
    try {
        const { sessionCode: codeToDemote } = req.body;

        if (!codeToDemote) {
            return res.status(400).json({ message: 'The session code for downgrade is required..' });
        }
        
        const result = await Admin.deleteOne({ sessionCode: codeToDemote });
        if (result.deletedCount === 0) {
            return res.json({ message: 'The user was not an administrator..' });
        }
        res.json({ message: 'Downgraded user.' });
    } catch (err) {
        console.error('User degradation error:', err);
        res.status(500).json({ message: 'User degradation error.' });
    }
});

// Obsługa żądań do plików statycznych z lepszym debugowaniem
app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'index.html');
    console.log('Attempt to send the index.html file from the path:', indexPath);
    res.sendFile(indexPath, (err) => {
        if (err) {
            console.error('Error sending index.html:', err);
            res.status(500).send('Server error - unable to load the home page');
        }
    });
});

// Catch-all route dla SPA - musi być na końcu
app.get('*', (req, res) => {
    // Sprawdź czy żądanie nie dotyczy API
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ message: 'Endpoint not found' });
    }
    
    const indexPath = path.join(__dirname, 'index.html');
    console.log('Catch-all: attempt to send index.html file from path:', indexPath);
    res.sendFile(indexPath, (err) => {
        if (err) {
            console.error('Catch-all: Error sending index.html:', err);
            res.status(404).send('Page not found');
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unsupported error:', err);
    res.status(500).json({ message: 'Internal server error' });
});

// Start serwera
const startServer = async () => {
    await connectDB();
    
    app.listen(PORT, () => {
        console.log(`Serwer działa na porcie ${PORT}`);
        console.log(`URL: http://localhost:${PORT}`);
        console.log(`Owner session code: ${OWNER_SESSION_CODE}`);
        console.log('Aktualne pliki w katalogu:', require('fs').readdirSync(__dirname));
    });
};

startServer().catch(err => {
    console.error('Błąd uruchomienia serwera:', err);
    process.exit(1);
});

