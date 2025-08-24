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

// Middleware do sprawdzania uprawnień admina
const checkAdmin = async (req, res, next) => {
    try {
        const sessionCode = req.header('X-Session-Code');
        if (!sessionCode) {
            return res.status(401).json({ message: 'Brak kodu sesji.' });
        }
        
        // Sprawdź czy to owner
        if (sessionCode === process.env.OWNER_SESSION_CODE) {
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
        
        return res.status(403).json({ message: 'Brak uprawnień admina.' });
    } catch (err) {
        console.error('Błąd sprawdzania uprawnień:', err);
        return res.status(500).json({ message: 'Błąd serwera.' });
    }
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
        console.error('Błąd pobierania punktów publicznych:', err);
        res.status(500).json({ message: 'Błąd pobierania punktów.' });
    }
});

// GET - Pobieranie punktów prywatnych dla danej sesji
app.get('/api/points/private', async (req, res) => {
    try {
        const sessionCode = req.header('X-Session-Code');
        if (!sessionCode) {
            return res.status(401).json({ message: 'Brak kodu sesji.' });
        }
        const privatePoints = await Point.find({ ownerSessionCode: sessionCode });
        res.json(privatePoints);
    } catch (err) {
        console.error('Błąd pobierania punktów prywatnych:', err);
        res.status(500).json({ message: 'Błąd pobierania punktów.' });
    }
});

// POST - Dodawanie nowego punktu (domyślnie status: private)
app.post('/api/points', async (req, res) => {
    try {
        const { name, x, z } = req.body;
        const ownerSessionCode = req.header('X-Session-Code');

        if (!name || name.trim() === '') {
            return res.status(400).json({ message: 'Nazwa punktu jest wymagana.' });
        }

        if (x === undefined || z === undefined) {
            return res.status(400).json({ message: 'Współrzędne X i Z są wymagane.' });
        }

        if (!ownerSessionCode) {
            return res.status(400).json({ message: 'Kod sesji jest wymagany.' });
        }

        const numX = parseInt(x);
        const numZ = parseInt(z);

        if (isNaN(numX) || isNaN(numZ)) {
            return res.status(400).json({ message: 'Współrzędne muszą być liczbami.' });
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
        console.error('Błąd dodawania punktu:', err);
        res.status(500).json({ message: 'Błąd dodawania punktu.' });
    }
});

// PUT - Edycja punktu (tylko właściciel)
app.put('/api/points/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, x, z } = req.body;
        const sessionCode = req.header('X-Session-Code');

        if (!name || name.trim() === '') {
            return res.status(400).json({ message: 'Nazwa punktu jest wymagana.' });
        }

        if (x === undefined || z === undefined) {
            return res.status(400).json({ message: 'Współrzędne X i Z są wymagane.' });
        }

        const numX = parseInt(x);
        const numZ = parseInt(z);

        if (isNaN(numX) || isNaN(numZ)) {
            return res.status(400).json({ message: 'Współrzędne muszą być liczbami.' });
        }

        const point = await Point.findById(id);
        if (!point) {
            return res.status(404).json({ message: 'Punkt nie znaleziony.' });
        }

        if (point.ownerSessionCode !== sessionCode) {
            return res.status(403).json({ message: 'Brak uprawnień do edycji tego punktu.' });
        }

        point.name = name.trim();
        point.x = numX;
        point.z = numZ;
        await point.save();
        res.json(point);
    } catch (err) {
        console.error('Błąd edycji punktu:', err);
        res.status(500).json({ message: 'Błąd edycji punktu.' });
    }
});

// PUT - Udostępnianie punktu do akceptacji admina
app.put('/api/points/share/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const sessionCode = req.header('X-Session-Code');

        const point = await Point.findById(id);
        if (!point) {
            return res.status(404).json({ message: 'Punkt nie znaleziony.' });
        }

        if (point.ownerSessionCode !== sessionCode) {
            return res.status(403).json({ message: 'Brak uprawnień do udostępnienia tego punktu.' });
        }

        if (point.status === 'pending') {
            return res.status(400).json({ message: 'Punkt już oczekuje na akceptację.' });
        }

        if (point.status === 'public') {
            return res.status(400).json({ message: 'Punkt jest już publiczny.' });
        }

        point.status = 'pending';
        await point.save();
        res.json(point);
    } catch (err) {
        console.error('Błąd udostępniania punktu:', err);
        res.status(500).json({ message: 'Błąd udostępniania punktu.' });
    }
});

// DELETE - Usuwanie punktu (tylko właściciel)
app.delete('/api/points/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const sessionCode = req.header('X-Session-Code');

        const point = await Point.findById(id);
        if (!point) {
            return res.status(404).json({ message: 'Punkt nie znaleziony.' });
        }

        if (point.ownerSessionCode !== sessionCode) {
            return res.status(403).json({ message: 'Brak uprawnień do usunięcia tego punktu.' });
        }

        await Point.findByIdAndDelete(id);
        res.json({ message: 'Punkt usunięty.' });
    } catch (err) {
        console.error('Błąd usuwania punktu:', err);
        res.status(500).json({ message: 'Błąd usuwania punktu.' });
    }
});

// === ENDPOINTY ADMINA ===

// POST - Logowanie admina
app.post('/api/admin/login', async (req, res) => {
    try {
        const { adminCode } = req.body;
        const sessionCode = req.header('X-Session-Code');
        
        if (!sessionCode) {
            return res.status(400).json({ success: false, message: 'Brak kodu sesji.' });
        }
        
        if (!adminCode) {
            return res.status(400).json({ success: false, message: 'Brak kodu admina.' });
        }
        
        // Sprawdź czy kod admina jest poprawny
        if (adminCode === process.env.ADMIN_CODE) {
            try {
                const existingAdmin = await Admin.findOne({ sessionCode });
                if (!existingAdmin) {
                    const newAdmin = new Admin({ sessionCode });
                    await newAdmin.save();
                }
                res.json({ success: true, message: 'Zalogowano jako admin' });
            } catch (err) {
                if (err.code === 11000) {
                    // Użytkownik już jest adminem
                    res.json({ success: true, message: 'Zalogowano jako admin' });
                } else {
                    console.error('Błąd zapisywania admina:', err);
                    res.status(500).json({ success: false, message: 'Błąd serwera' });
                }
            }
        } else {
            res.status(401).json({ success: false, message: 'Niepoprawny kod admina' });
        }
    } catch (err) {
        console.error('Błąd logowania admina:', err);
        res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
});

// GET - Pobieranie punktów do akceptacji (admin)
app.get('/api/admin/pending', checkAdmin, async (req, res) => {
    try {
        const pendingPoints = await Point.find({ status: 'pending' });
        res.json(pendingPoints);
    } catch (err) {
        console.error('Błąd pobierania oczekujących punktów:', err);
        res.status(500).json({ message: 'Błąd pobierania oczekujących punktów.' });
    }
});

// PUT - Akceptowanie punktu (admin)
app.put('/api/admin/accept/:id', checkAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const point = await Point.findById(id);
        if (!point) {
            return res.status(404).json({ message: 'Punkt nie znaleziony.' });
        }
        if (point.status !== 'pending') {
            return res.status(400).json({ message: 'Punkt nie oczekuje na akceptację.' });
        }
        point.status = 'public';
        await point.save();
        res.json(point);
    } catch (err) {
        console.error('Błąd akceptacji punktu:', err);
        res.status(500).json({ message: 'Błąd akceptacji punktu.' });
    }
});

// PUT - Odrzucenie punktu (zmiana z pending na private)
app.put('/api/admin/reject/:id', checkAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const point = await Point.findById(id);
        if (!point) {
            return res.status(404).json({ message: 'Punkt nie znaleziony.' });
        }
        if (point.status !== 'pending') {
            return res.status(400).json({ message: 'Punkt nie oczekuje na akceptację.' });
        }
        point.status = 'private';
        await point.save();
        res.json(point);
    } catch (err) {
        console.error('Błąd odrzucenia punktu:', err);
        res.status(500).json({ message: 'Błąd odrzucenia punktu.' });
    }
});

// PUT - Edycja punktu publicznego (admin)
app.put('/api/admin/edit/:id', checkAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, x, z } = req.body;

        if (!name || name.trim() === '') {
            return res.status(400).json({ message: 'Nazwa punktu jest wymagana.' });
        }

        if (x === undefined || z === undefined) {
            return res.status(400).json({ message: 'Współrzędne X i Z są wymagane.' });
        }

        const numX = parseInt(x);
        const numZ = parseInt(z);

        if (isNaN(numX) || isNaN(numZ)) {
            return res.status(400).json({ message: 'Współrzędne muszą być liczbami.' });
        }

        const point = await Point.findById(id);
        if (!point) {
            return res.status(404).json({ message: 'Punkt nie znaleziony.' });
        }
        point.name = name.trim();
        point.x = numX;
        point.z = numZ;
        await point.save();
        res.json(point);
    } catch (err) {
        console.error('Błąd edycji punktu przez admina:', err);
        res.status(500).json({ message: 'Błąd edycji punktu.' });
    }
});

// DELETE - Usuwanie punktu (admin)
app.delete('/api/admin/delete/:id', checkAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const point = await Point.findById(id);
        if (!point) {
            return res.status(404).json({ message: 'Punkt nie znaleziony.' });
        }
        await Point.findByIdAndDelete(id);
        res.json({ message: 'Punkt usunięty.' });
    } catch (err) {
        console.error('Błąd usuwania punktu przez admina:', err);
        res.status(500).json({ message: 'Błąd usuwania punktu.' });
    }
});

// === ENDPOINTY OWNERA ===

// POST - Logowanie ownera
app.post('/api/owner/login', async (req, res) => {
    try {
        const { ownerCode } = req.body;
        const sessionCode = req.header('X-Session-Code');
        
        if (!sessionCode) {
            return res.status(400).json({ success: false, message: 'Brak kodu sesji.' });
        }
        
        if (!ownerCode) {
            return res.status(400).json({ success: false, message: 'Brak kodu ownera.' });
        }
        
        // Sprawdź czy kod ownera jest poprawny
        if (ownerCode === process.env.OWNER_CODE) {
            res.json({ success: true, message: 'Zalogowano jako owner' });
        } else {
            res.status(401).json({ success: false, message: 'Niepoprawny kod ownera' });
        }
    } catch (err) {
        console.error('Błąd logowania ownera:', err);
        res.status(500).json({ success: false, message: 'Błąd serwera' });
    }
});

// PUT - Awansowanie użytkownika na admina (owner)
app.put('/api/owner/promote', async (req, res) => {
    try {
        const sessionCode = req.header('X-Session-Code');
        const { sessionCode: codeToPromote } = req.body;

        if (sessionCode !== process.env.OWNER_SESSION_CODE) {
            return res.status(403).json({ message: 'Brak uprawnień ownera.' });
        }

        if (!codeToPromote) {
            return res.status(400).json({ message: 'Kod sesji do awansowania jest wymagany.' });
        }

        const existingAdmin = await Admin.findOne({ sessionCode: codeToPromote });
        if (existingAdmin) {
            return res.json({ message: 'Użytkownik już jest adminem.' });
        }
        
        const newAdmin = new Admin({ sessionCode: codeToPromote });
        await newAdmin.save();
        res.json({ message: 'Użytkownik awansowany na admina.' });
    } catch (err) {
        console.error('Błąd awansowania użytkownika:', err);
        res.status(500).json({ message: 'Błąd awansowania użytkownika.' });
    }
});

// DELETE - Usunięcie admina (owner)
app.delete('/api/owner/demote', async (req, res) => {
    try {
        const sessionCode = req.header('X-Session-Code');
        const { sessionCode: codeToDemote } = req.body;

        if (sessionCode !== process.env.OWNER_SESSION_CODE) {
            return res.status(403).json({ message: 'Brak uprawnień ownera.' });
        }

        if (!codeToDemote) {
            return res.status(400).json({ message: 'Kod sesji do degradacji jest wymagany.' });
        }
        
        const result = await Admin.deleteOne({ sessionCode: codeToDemote });
        if (result.deletedCount === 0) {
            return res.json({ message: 'Użytkownik nie był adminem.' });
        }
        res.json({ message: 'Użytkownik zdegradowany.' });
    } catch (err) {
        console.error('Błąd degradacji użytkownika:', err);
        res.status(500).json({ message: 'Błąd degradacji użytkownika.' });
    }
});

// Obsługa żądań do plików statycznych z lepszym debugowaniem
app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'index.html');
    console.log('Próba wysłania pliku index.html z ścieżki:', indexPath);
    res.sendFile(indexPath, (err) => {
        if (err) {
            console.error('Błąd wysyłania index.html:', err);
            res.status(500).send('Błąd serwera - nie można załadować strony głównej');
        }
    });
});

// Catch-all route dla SPA - musi być na końcu
app.get('*', (req, res) => {
    // Sprawdź czy żądanie nie dotyczy API
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ message: 'Endpoint nie znaleziony' });
    }
    
    const indexPath = path.join(__dirname, 'index.html');
    console.log('Catch-all: próba wysłania pliku index.html z ścieżki:', indexPath);
    res.sendFile(indexPath, (err) => {
        if (err) {
            console.error('Catch-all: Błąd wysyłania index.html:', err);
            res.status(404).send('Strona nie znaleziona');
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Nieobsługiwany błąd:', err);
    res.status(500).json({ message: 'Wewnętrzny błąd serwera' });
});

// Start serwera
const startServer = async () => {
    await connectDB();
    
    app.listen(PORT, () => {
        console.log(`Serwer działa na porcie ${PORT}`);
        console.log(`URL: http://localhost:${PORT}`);
        console.log('Aktualne pliki w katalogu:', require('fs').readdirSync(__dirname));
    });
};

startServer().catch(err => {
    console.error('Błąd uruchomienia serwera:', err);
    process.exit(1);
});

