const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Poprawka: serowanie plików statycznych z katalogu gdzie są pliki HTML/CSS/JS
app.use(express.static(__dirname));

// Połączenie z bazą danych MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('Połączenie z bazą danych MongoDB udane!'))
.catch(err => console.error('Błąd połączenia z bazą danych:', err));

// Schemat i model dla punktów na mapie
const pointSchema = new mongoose.Schema({
    name: String,
    x: Number,
    z: Number,
    ownerSessionCode: String,
    status: {
        type: String,
        enum: ['private', 'pending', 'public'],
        default: 'private'
    }
});
const Point = mongoose.model('Point', pointSchema);

// Schemat i model dla uprawnień admina
const adminSchema = new mongoose.Schema({
    sessionCode: {
        type: String,
        unique: true,
        required: true
    }
});
const Admin = mongoose.model('Admin', adminSchema);

// Middleware do sprawdzania uprawnień admina
async function checkAdmin(req, res, next) {
    const sessionCode = req.header('X-Session-Code');
    if (!sessionCode) {
        return res.status(401).json({ message: 'Brak kodu sesji.' });
    }
    
    // Sprawdź czy to owner
    if (sessionCode === process.env.OWNER_SESSION_CODE) {
        req.isAdmin = true;
        return next();
    }
    
    // Sprawdź czy to admin z bazy
    try {
        const admin = await Admin.findOne({ sessionCode });
        if (admin) {
            req.isAdmin = true;
            return next();
        }
    } catch (err) {
        console.error('Błąd sprawdzania uprawnień:', err);
        return res.status(500).json({ message: 'Błąd serwera.' });
    }
    
    return res.status(403).json({ message: 'Brak uprawnień admina.' });
}

// === Endpointy API ===

// GET - Pobieranie wszystkich punktów publicznych
app.get('/api/points', async (req, res) => {
    try {
        const publicPoints = await Point.find({ status: 'public' });
        res.json(publicPoints);
    } catch (err) {
        console.error('Błąd pobierania punktów publicznych:', err);
        res.status(500).json({ message: err.message });
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
        res.status(500).json({ message: err.message });
    }
});

// POST - Dodawanie nowego punktu (domyślnie status: private)
app.post('/api/points', async (req, res) => {
    const { name, x, z } = req.body;
    const ownerSessionCode = req.header('X-Session-Code');

    if (!name || x === undefined || z === undefined || !ownerSessionCode) {
        return res.status(400).json({ message: 'Wszystkie pola są wymagane.' });
    }

    try {
        const newPoint = new Point({ name, x, z, ownerSessionCode, status: 'private' });
        await newPoint.save();
        res.status(201).json(newPoint);
    } catch (err) {
        console.error('Błąd dodawania punktu:', err);
        res.status(500).json({ message: err.message });
    }
});

// PUT - Edycja punktu (tylko właściciel)
app.put('/api/points/:id', async (req, res) => {
    const { id } = req.params;
    const { name, x, z } = req.body;
    const sessionCode = req.header('X-Session-Code');

    try {
        const point = await Point.findById(id);
        if (!point || point.ownerSessionCode !== sessionCode) {
            return res.status(403).json({ message: 'Brak uprawnień do edycji tego punktu.' });
        }
        point.name = name;
        point.x = x;
        point.z = z;
        await point.save();
        res.json(point);
    } catch (err) {
        console.error('Błąd edycji punktu:', err);
        res.status(500).json({ message: err.message });
    }
});

// PUT - Udostępnianie punktu do akceptacji admina
app.put('/api/points/share/:id', async (req, res) => {
    const { id } = req.params;
    const sessionCode = req.header('X-Session-Code');

    try {
        const point = await Point.findById(id);
        if (!point || point.ownerSessionCode !== sessionCode) {
            return res.status(403).json({ message: 'Brak uprawnień do udostępnienia tego punktu.' });
        }
        point.status = 'pending';
        await point.save();
        res.json(point);
    } catch (err) {
        console.error('Błąd udostępniania punktu:', err);
        res.status(500).json({ message: err.message });
    }
});

// DELETE - Usuwanie punktu (tylko właściciel)
app.delete('/api/points/:id', async (req, res) => {
    const { id } = req.params;
    const sessionCode = req.header('X-Session-Code');

    try {
        const point = await Point.findById(id);
        if (!point || point.ownerSessionCode !== sessionCode) {
            return res.status(403).json({ message: 'Brak uprawnień do usunięcia tego punktu.' });
        }
        await point.deleteOne();
        res.json({ message: 'Punkt usunięty.' });
    } catch (err) {
        console.error('Błąd usuwania punktu:', err);
        res.status(500).json({ message: err.message });
    }
});

// === Endpointy Admina ===

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
            // Zapisz sessionCode jako admina w bazie
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
        res.status(500).json({ message: err.message });
    }
});

// PUT - Akceptowanie punktu (admin)
app.put('/api/admin/accept/:id', checkAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const point = await Point.findById(id);
        if (!point) {
            return res.status(404).json({ message: 'Punkt nie znaleziony.' });
        }
        point.status = 'public';
        await point.save();
        res.json(point);
    } catch (err) {
        console.error('Błąd akceptacji punktu:', err);
        res.status(500).json({ message: err.message });
    }
});

// PUT - Edycja punktu publicznego (admin)
app.put('/api/admin/edit/:id', checkAdmin, async (req, res) => {
    const { id } = req.params;
    const { name, x, z } = req.body;
    try {
        const point = await Point.findById(id);
        if (!point) {
            return res.status(404).json({ message: 'Punkt nie znaleziony.' });
        }
        point.name = name;
        point.x = x;
        point.z = z;
        await point.save();
        res.json(point);
    } catch (err) {
        console.error('Błąd edycji punktu przez admina:', err);
        res.status(500).json({ message: err.message });
    }
});

// DELETE - Usuwanie punktu (admin)
app.delete('/api/admin/delete/:id', checkAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const point = await Point.findById(id);
        if (!point) {
            return res.status(404).json({ message: 'Punkt nie znaleziony.' });
        }
        await point.deleteOne();
        res.json({ message: 'Punkt usunięty.' });
    } catch (err) {
        console.error('Błąd usuwania punktu przez admina:', err);
        res.status(500).json({ message: err.message });
    }
});

// === Endpointy Ownera ===

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
    const sessionCode = req.header('X-Session-Code');
    const { sessionCode: codeToPromote } = req.body;

    if (sessionCode !== process.env.OWNER_SESSION_CODE) {
        return res.status(403).json({ message: 'Brak uprawnień ownera.' });
    }

    try {
        const existingAdmin = await Admin.findOne({ sessionCode: codeToPromote });
        if (existingAdmin) {
            return res.json({ message: 'Użytkownik już jest adminem.' });
        }
        
        const newAdmin = new Admin({ sessionCode: codeToPromote });
        await newAdmin.save();
        res.json({ message: 'Użytkownik awansowany na admina.' });
    } catch (err) {
        console.error('Błąd awansowania użytkownika:', err);
        res.status(500).json({ message: err.message });
    }
});

// DELETE - Usunięcie admina (owner)
app.delete('/api/owner/demote', async (req, res) => {
    const sessionCode = req.header('X-Session-Code');
    const { sessionCode: codeToDemote } = req.body;

    if (sessionCode !== process.env.OWNER_SESSION_CODE) {
        return res.status(403).json({ message: 'Brak uprawnień ownera.' });
    }
    
    try {
        const result = await Admin.deleteOne({ sessionCode: codeToDemote });
        if (result.deletedCount === 0) {
            return res.json({ message: 'Użytkownik nie był adminem.' });
        }
        res.json({ message: 'Użytkownik zdegradowany.' });
    } catch (err) {
        console.error('Błąd degradacji użytkownika:', err);
        res.status(500).json({ message: err.message });
    }
});

// Catch-all route dla SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Serwer działa na http://localhost:${PORT}`);
});
