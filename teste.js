require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const validator = require('validator'); // Importando a biblioteca validator

// Basic Configuration
const app = express();
const port = process.env.PORT || 3000;

// Conectando ao MongoDB
mongoose.connect(process.env.DB_URL)
    .then(() => console.log("Conectado ao MongoDB!"))
    .catch(err => console.error("Erro de conexão:", err));

// Middleware
app.use(express.urlencoded({ extended: true })); // Middleware para processar dados de formulários
app.use(cors())
app.use(express.json()); // Para processar JSON

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', (req, res) => {
    res.sendFile(process.cwd() + '/views/index.html');
});

// Definindo o esquema e o modelo
const urlScheme = new mongoose.Schema({
    original_url: { type: String, required: true, unique: true }, // Adicionando unique para evitar duplicatas
    short_url: { type: String, required: true, unique: true }
});
const Url = mongoose.model('Url', urlScheme);

// Função para gerar um código curto único
async function gerarCodigoCurto() {
    let resultado;
    const min = 1; // Valor mínimo para short_url
    const max = 99999; // Valor máximo para short_url (ajuste conforme necessário)

    do {
        resultado = Math.floor(Math.random() * (max - min + 1)) + min; // Gera um número aleatório entre min e max
    } while (await Url.findOne({ short_url: resultado })); // Verifica se o código já existe no banco de dados

    return resultado; // Retorna o código gerado
}

// Endpoint para encurtar URL
// Endpoint para encurtar URL
app.post('/api/shorturl', async (req, res) => {
    const url = req.body.url;

    // Validação da URL usando validator
    if (!url || !validator.isURL(url)) {
        return res.status(400).json({ error: 'URL inválida' });
    }

    const shortCode = await gerarCodigoCurto(); // Gera um código curto único

    const newUrlPost = new Url({
        original_url: url,
        short_url: shortCode // Armazenando apenas o código curto no banco de dados
    });

    try {
        await newUrlPost.save(); // Salva a nova entrada no banco de dados
        res.json({
            original_url: url,
            short_url: shortCode // Retorna o código curto gerado
        });
    } catch (error) {
        res.status(500).json({ error: "Erro ao salvar a URL" });
    }
});

// Rota para redirecionar da URL curta para a URL original
/* app.get('/api/shorturl/:code', async (req, res) => {
    const code = req.params.code; // Captura o código da URL curta

    try {
        // Busca a URL original no banco de dados usando o código curto
        const urlEntry = await Url.findOne({ short_url: code });

        if (!urlEntry) {
            return res.status(404).json({ error: 'URL não encontrada' }); // Retorna erro se não encontrar
        }

        // Redireciona para a URL original
        res.redirect(urlEntry.original_url); 
    } catch (error) {
        res.status(500).json({ error: 'Erro ao redirecionar' });
    }
});
 */

// Iniciando o servidor
app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});
