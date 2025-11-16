const pollingStationService = require('../services/pollingStationService');

async function createStation(req, res, next) {
  try {
    const station = await pollingStationService.createStation(req.body);
    res.status(201).json({ success: true, data: station });
  } catch (error) {
    next(error);
  }
}

async function getStationById(req, res, next) {
  try {
    const station = await pollingStationService.getStationById(req.params.id);
    if (!station) {
      return res.status(404).json({ error: 'Polling station not found' });
    }
    res.json({ success: true, data: station });
  } catch (error) {
    next(error);
  }
}

async function getAllStations(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 2000;
    const filters = {};
    if (req.query.district) filters.district = req.query.district.trim();
    if (req.query.state) filters.state = req.query.state.trim();
    const result = await pollingStationService.getAllStations(page, limit, filters);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

async function findNearestStation(req, res, next) {
  try {
    const { district, state, pin_code } = req.query;
    if (!district || !state) {
      return res.status(400).json({ 
        success: false,
        error: 'District and state are required' 
      });
    }
    const result = await pollingStationService.findNearestStation(district, state, pin_code);
    
    if (!result || !result.station) {
      return res.status(404).json({ 
        success: false,
        error: 'No polling station found for the given location. Please check your district and state.',
        suggestions: 'Try searching with a different district name or contact support.'
      });
    }
    
    res.json({ 
      success: true, 
      data: result.station,
      alternatives: result.alternatives || []
    });
  } catch (error) {
    next(error);
  }
}

async function assignStationToVoter(req, res, next) {
  try {
    const { voter_id } = req.body;
    if (!voter_id) {
      return res.status(400).json({ error: 'voter_id required' });
    }
    await pollingStationService.assignStationToVoter(voter_id, parseInt(req.params.id));
    res.json({ success: true, message: 'Station assigned successfully' });
  } catch (error) {
    next(error);
  }
}

async function getStationVoterCount(req, res, next) {
  try {
    const count = await pollingStationService.getStationVoterCount(parseInt(req.params.id));
    res.json({ success: true, data: { count } });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createStation,
  getStationById,
  getAllStations,
  findNearestStation,
  assignStationToVoter,
  getStationVoterCount
};

