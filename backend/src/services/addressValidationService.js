const pool = require('../config/database');
const crypto = require('crypto');

/**
 * Address Validation Service
 * Handles address normalization, geocoding, and quality scoring
 */
class AddressValidationService {
  /**
   * Normalize address using simple tokenization and cleaning
   * In production, this would use libpostal or Google Places API
   */
  normalizeAddress(addressComponents) {
    const {
      house_number,
      street,
      village_city,
      district,
      state,
      pin_code
    } = addressComponents;

    // Clean and normalize each component
    const normalize = (str) => {
      if (!str) return '';
      return str
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/[^\w\s-]/g, '');
    };

    // Expand common abbreviations
    const expandAbbreviation = (str) => {
      const abbreviations = {
        'st': 'street',
        'rd': 'road',
        'ave': 'avenue',
        'blvd': 'boulevard',
        'dr': 'drive',
        'ln': 'lane',
        'ct': 'court',
        'pl': 'place',
        'sq': 'square',
        'n': 'north',
        's': 'south',
        'e': 'east',
        'w': 'west',
        'no': 'number',
        'apt': 'apartment',
        'fl': 'floor',
        'bldg': 'building'
      };

      let normalized = str.toLowerCase();
      Object.keys(abbreviations).forEach(abbr => {
        const regex = new RegExp(`\\b${abbr}\\b`, 'gi');
        normalized = normalized.replace(regex, abbreviations[abbr]);
      });
      return normalized;
    };

    const normalized = {
      house_number: normalize(house_number || ''),
      street: expandAbbreviation(normalize(street || '')),
      village_city: normalize(village_city || ''),
      district: normalize(district || ''),
      state: normalize(state || ''),
      pin_code: (pin_code || '').trim()
    };

    // Create normalized address string
    const normalizedString = [
      normalized.house_number,
      normalized.street,
      normalized.village_city,
      normalized.district,
      normalized.state,
      normalized.pin_code
    ].filter(Boolean).join(', ');

    return {
      normalized,
      normalizedString,
      components: normalized
    };
  }

  /**
   * Generate address hash for duplicate detection
   */
  generateAddressHash(normalizedAddress) {
    return crypto.createHash('sha256')
      .update(normalizedAddress.toLowerCase().trim())
      .digest('hex');
  }

  /**
   * Geocode address using Google Maps API with Mapbox fallback
   */
  async geocodeAddress(normalizedAddress, state, district, pinCode) {
    const axios = require('axios');
    
    // Try Google Maps Geocoding API first
    if (process.env.GOOGLE_MAPS_API_KEY) {
      try {
        const googleUrl = 'https://maps.googleapis.com/maps/api/geocode/json';
        const addressQuery = `${normalizedAddress}, ${district}, ${state}, India ${pinCode || ''}`.trim();
        
        const response = await axios.get(googleUrl, {
          params: {
            address: addressQuery,
            key: process.env.GOOGLE_MAPS_API_KEY,
            region: 'in'
          },
          timeout: 5000
        });

        if (response.data.status === 'OK' && response.data.results.length > 0) {
          const result = response.data.results[0];
          const location = result.geometry.location;
          
          // Verify location is in India
          const isInIndia = location.lat >= 6.5 && location.lat <= 37.1 && 
                           location.lng >= 68.1 && location.lng <= 97.4;
          
          if (isInIndia) {
            return {
              latitude: parseFloat(location.lat.toFixed(8)),
              longitude: parseFloat(location.lng.toFixed(8)),
              confidence: result.geometry.location_type === 'ROOFTOP' ? 0.95 : 
                         result.geometry.location_type === 'RANGE_INTERPOLATED' ? 0.85 : 0.75,
              provider: 'google_maps',
              formatted_address: result.formatted_address
            };
          }
        }
      } catch (error) {
        console.warn('Google Maps geocoding failed, trying Mapbox:', error.message);
      }
    }

    // Fallback to Mapbox Geocoding API
    if (process.env.MAPBOX_ACCESS_TOKEN) {
      try {
        const mapboxUrl = 'https://api.mapbox.com/geocoding/v5/mapbox.places';
        const addressQuery = encodeURIComponent(`${normalizedAddress}, ${district}, ${state}, India ${pinCode || ''}`.trim());
        
        const response = await axios.get(`${mapboxUrl}/${addressQuery}.json`, {
          params: {
            access_token: process.env.MAPBOX_ACCESS_TOKEN,
            country: 'in',
            limit: 1
          },
          timeout: 5000
        });

        if (response.data.features && response.data.features.length > 0) {
          const feature = response.data.features[0];
          const [longitude, latitude] = feature.center;
          
          // Verify location is in India
          const isInIndia = latitude >= 6.5 && latitude <= 37.1 && 
                           longitude >= 68.1 && longitude <= 97.4;
          
          if (isInIndia) {
            return {
              latitude: parseFloat(latitude.toFixed(8)),
              longitude: parseFloat(longitude.toFixed(8)),
              confidence: feature.relevance || 0.8,
              provider: 'mapbox',
              formatted_address: feature.place_name
            };
          }
        }
      } catch (error) {
        console.warn('Mapbox geocoding failed, using fallback:', error.message);
      }
    }

    // Fallback to deterministic mock geocoding
    const indiaBounds = {
      minLat: 6.5,
      maxLat: 37.1,
      minLng: 68.1,
      maxLng: 97.4
    };

    const hash = this.generateAddressHash(normalizedAddress);
    const seed = parseInt(hash.substring(0, 8), 16);
    
    const latitude = indiaBounds.minLat + 
      (seed % 1000000) / 1000000 * (indiaBounds.maxLat - indiaBounds.minLat);
    const longitude = indiaBounds.minLng + 
      ((seed * 7) % 1000000) / 1000000 * (indiaBounds.maxLng - indiaBounds.minLng);

    let confidence = 0.6; // Lower confidence for mock
    if (normalizedAddress.includes(',') && normalizedAddress.split(',').length >= 3) confidence = 0.7;
    if (pinCode && pinCode.length === 6) confidence = Math.min(confidence + 0.1, 0.75);

    return {
      latitude: parseFloat(latitude.toFixed(8)),
      longitude: parseFloat(longitude.toFixed(8)),
      confidence: parseFloat(confidence.toFixed(2)),
      provider: 'fallback'
    };
  }

  /**
   * Calculate address quality score
   */
  calculateQualityScore(addressComponents, normalizedAddress, geocodeResult) {
    let score = 0.0;
    let maxScore = 0.0;

    // Component completeness (40%)
    maxScore += 40;
    if (addressComponents.house_number) score += 5;
    if (addressComponents.street) score += 10;
    if (addressComponents.village_city) score += 10;
    if (addressComponents.district) score += 5;
    if (addressComponents.state) score += 5;
    if (addressComponents.pin_code && addressComponents.pin_code.length === 6) score += 5;

    // Normalized address quality (20%)
    maxScore += 20;
    const normalizedParts = normalizedAddress.split(',').filter(p => p.trim().length > 0);
    if (normalizedParts.length >= 3) score += 10;
    if (normalizedParts.length >= 4) score += 5;
    if (normalizedParts.length >= 5) score += 5;

    // Geocode confidence (30%)
    maxScore += 30;
    if (geocodeResult && geocodeResult.confidence) {
      score += geocodeResult.confidence * 30;
    }

    // PIN code validation (10%)
    maxScore += 10;
    if (addressComponents.pin_code) {
      const pin = addressComponents.pin_code.trim();
      if (/^\d{6}$/.test(pin)) {
        score += 10;
      }
    }

    const finalScore = Math.min(score / maxScore, 1.0);
    return parseFloat(finalScore.toFixed(2));
  }

  /**
   * Validate PIN code to district/state mapping (mock)
   */
  async validatePinCodeMapping(pinCode, district, state) {
    // In production, use India Post PIN code database
    // For now, return true if PIN is 6 digits
    if (!pinCode || !/^\d{6}$/.test(pinCode)) {
      return { valid: false, reason: 'Invalid PIN code format' };
    }

    // Mock validation - in production check actual mapping
    return { valid: true };
  }

  /**
   * Full address validation pipeline
   */
  async validateAddress(addressComponents) {
    const connection = await pool.getConnection();
    try {
      // 1. Normalize address
      const normalized = this.normalizeAddress(addressComponents);
      
      // 2. Generate hash
      const addressHash = this.generateAddressHash(normalized.normalizedString);
      
      // 3. Check cache
      const [cached] = await connection.query(
        'SELECT * FROM address_validation_cache WHERE address_hash = ? AND expires_at > NOW()',
        [addressHash]
      );

      let geocodeResult;
      if (cached.length > 0) {
        geocodeResult = {
          latitude: cached[0].geocode_latitude,
          longitude: cached[0].geocode_longitude,
          confidence: cached[0].geocode_confidence,
          provider: cached[0].geocode_provider
        };
      } else {
        // 4. Geocode
        geocodeResult = await this.geocodeAddress(
          normalized.normalizedString,
          addressComponents.state,
          addressComponents.district,
          addressComponents.pin_code
        );

        // Cache result
        await connection.query(
          `INSERT INTO address_validation_cache 
           (address_hash, normalized_address, geocode_latitude, geocode_longitude, geocode_confidence, geocode_provider, quality_score, expires_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY))
           ON DUPLICATE KEY UPDATE
           normalized_address = VALUES(normalized_address),
           geocode_latitude = VALUES(geocode_latitude),
           geocode_longitude = VALUES(geocode_longitude),
           geocode_confidence = VALUES(geocode_confidence),
           quality_score = VALUES(quality_score),
           expires_at = VALUES(expires_at)`,
          [
            addressHash,
            normalized.normalizedString,
            geocodeResult.latitude,
            geocodeResult.longitude,
            geocodeResult.confidence,
            geocodeResult.provider,
            0.8 // Will be calculated below
          ]
        );
      }

      // 5. Validate PIN code mapping
      const pinValidation = await this.validatePinCodeMapping(
        addressComponents.pin_code,
        addressComponents.district,
        addressComponents.state
      );

      // 6. Calculate quality score
      const qualityScore = this.calculateQualityScore(
        addressComponents,
        normalized.normalizedString,
        geocodeResult
      );

      // 7. Determine validation result
      let validationResult = 'passed';
      const flags = [];

      if (qualityScore < 0.5) {
        validationResult = 'rejected';
        flags.push('low_quality_score');
      } else if (qualityScore < 0.75) {
        validationResult = 'flagged';
        flags.push('medium_quality_score');
      }

      if (!pinValidation.valid) {
        validationResult = 'flagged';
        flags.push('pin_mismatch');
      }

      if (geocodeResult.confidence < 0.5) {
        validationResult = 'flagged';
        flags.push('low_geocode_confidence');
      }

      return {
        valid: validationResult === 'passed',
        normalized: normalized.normalizedString,
        normalizedComponents: normalized.components,
        addressHash,
        geocode: geocodeResult,
        qualityScore,
        validationResult,
        flags,
        pinValidation
      };
    } finally {
      connection.release();
    }
  }
}

module.exports = new AddressValidationService();

