require("dotenv").config();
const express = require('express');
const { CosmosClient } = require('@azure/cosmos');
const multer = require('multer');
const { BlobServiceClient } = require('@azure/storage-blob');

const inMemoryStorage = multer.memoryStorage();
const uploadStrategy = multer({ storage: inMemoryStorage }).single('file');
const azureStorageConfig = {
  connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING,
  containerName: 'esime2024'
};

const app = express();
app.use(express.json());

const endpoint = process.env.COSMOS_ENDPOINT;
const key = process.env.COSMOS_KEY;
const client = new CosmosClient({ endpoint, key });
const database = client.database('SuperNovaSkyFire');
const container = database.container('Contenedor1');

// Endpoint para obtener datos
app.get('/api/data', async (req, res) => {
    const { resources: items } = await container.items
        .query("SELECT * from c")
        .fetchAll();
    res.json(items);
});

// Endpoint para cargar archivos
app.post('/upload', uploadStrategy, async (req, res) => {
    if (!req.file) {
      return res.status(400).send('No file uploaded.');
    }

    const blobServiceClient = BlobServiceClient.fromConnectionString(azureStorageConfig.connectionString);
    const containerClient = blobServiceClient.getContainerClient(azureStorageConfig.containerName);
    
    const blobName = `blob-${new Date().getTime()}-${req.file.originalname}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    const uploadBlobResponse = await blockBlobClient.upload(req.file.buffer, req.file.size);
    console.log(`Upload block blob ${blobName} successfully`, uploadBlobResponse.requestId);
    
    res.send({
        message: 'File uploaded to Azure Blob Storage successfully',
        blobName: blobName,
        requestId: uploadBlobResponse.requestId
    });
});