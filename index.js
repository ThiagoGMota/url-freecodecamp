import cors from 'cors';
import express from 'express';
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import validator from 'validator';

dotenv.config();

console.log('Conectando...');

const app = express();
const DB_Key = process.env.DB_URL;
const port = process.env.PORT || 3000;


mongoose.connect(DB_Key)
  .then(() => console.log("Conectado ao MongoDB"))
  .catch(err => console.error("Erro ao conectar ao banco", err));

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false })); // Usando extended: false
app.use('/public', express.static(`${process.cwd()}/public`));

const urlSchema = new mongoose.Schema({
  original_url: {
    type: String,
    required: true
  },
  short_url: {
    type: String,
    required: true,
    unique: true
  },
  clicks: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});
const URL = mongoose.model('URL', urlSchema);

async function gerarCodigoUrl() {
  let resultado;
  const min = 1;
  const max = 99999;

  do {
    resultado = Math.floor(Math.random() * (max - min + 1)) + min;
  } while (await URL.findOne({ short_url: resultado }));

  return resultado;
}

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

app.post('/api/shorturl', async function(req, res) {
  const original_url = req.body.url;
  const short_url = await gerarCodigoUrl();

  if (!original_url || !validator.isURL(original_url)) {
    return res.status(400).json({ error: 'URL inválida' });
  }

  try {
    // Verifica se a URL já existe
    const existingUrl = await URL.findOne({ original_url: original_url });
    if (existingUrl) {
      return res.status(400).json({ error: 'URL já encurtada', short_url: existingUrl.short_url });
    }

    const newUrlPost = new URL({
      original_url: original_url,
      short_url: short_url
    });

    await newUrlPost.save();
    res.json({
      'original_url': original_url,
      'short_url': short_url
    });
  } catch (error) {
    res.status(500).json({ error: "Erro ao salvar a URL" });
  }
});

app.get('/api/shorturl/:codigo', async function(req, res) {
  const shortUrlCode = req.params.codigo;

  try {
    const url = await URL.findOneAndUpdate(
      { short_url: shortUrlCode },
      { $inc: { clicks: 1 } },
      { new: true }
    );

    if (url) {
      res.redirect(url.original_url);
    } else {
      res.status(404).json({ error: 'URL encurtada não encontrada' });
    }
  } catch (error) {
    console.error("Erro ao redirecionar:", error);
    res.status(500).json({ error: "Erro ao redirecionar" });
  }
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
