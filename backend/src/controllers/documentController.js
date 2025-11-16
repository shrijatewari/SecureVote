const documentService = require('../services/documentService');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

async function uploadDocument(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'File required' });
    }
    
    const { voter_id, document_type } = req.body;
    if (!voter_id || !document_type) {
      return res.status(400).json({ error: 'voter_id and document_type required' });
    }

    const result = await documentService.uploadDocument(
      parseInt(voter_id),
      document_type,
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );
    
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    // Handle data truncation errors specifically
    if (error.code === 'WARN_DATA_TRUNCATED' || error.code === 1265) {
      return res.status(400).json({ 
        error: 'Invalid document type',
        message: `The document type '${req.body.document_type}' is not supported. Please use one of: aadhaar, address_proof, photo, signature, disability_cert, birth_cert, marriage_cert, affidavit`
      });
    }
    next(error);
  }
}

async function getVoterDocuments(req, res, next) {
  try {
    const documents = await documentService.getVoterDocuments(parseInt(req.params.voterId));
    res.json({ success: true, data: documents });
  } catch (error) {
    next(error);
  }
}

async function getDocument(req, res, next) {
  try {
    const document = await documentService.getDocument(parseInt(req.params.id));
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    res.setHeader('Content-Type', document.mime_type);
    res.setHeader('Content-Disposition', `attachment; filename="${document.document_name}"`);
    res.send(document.file_content);
  } catch (error) {
    next(error);
  }
}

async function deleteDocument(req, res, next) {
  try {
    await documentService.deleteDocument(parseInt(req.params.id));
    res.json({ success: true, message: 'Document deleted' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  uploadDocument: [upload.single('file'), uploadDocument],
  getVoterDocuments,
  getDocument,
  deleteDocument
};

