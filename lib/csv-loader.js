// lib/csv-loader.js
// CSV file loader for browser environment

/**
 * Fetches and parses a CSV file
 * @param {string} filepath - Path to CSV file (e.g., 'data/canonical/drivers_2025.csv')
 * @returns {Promise<Array<Object>>} Array of row objects
 */
export async function loadCSV(filepath) {
  try {
    const response = await fetch(filepath, { cache: 'no-cache' });

    if (!response.ok) {
      throw new Error(`Failed to load CSV: ${filepath} (${response.status})`);
    }

    const csvText = await response.text();
    return parseCSV(csvText);
  } catch (error) {
    console.error(`[CSV Loader] Error loading ${filepath}:`, error);
    throw error;
  }
}

/**
 * Parses CSV text into array of objects
 * @param {string} csvText - Raw CSV content
 * @returns {Array<Object>} Array of row objects with headers as keys
 */
export function parseCSV(csvText) {
  // Handle both \r\n (Windows) and \n (Unix) line endings
  const lines = csvText.trim().replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  if (lines.length === 0) {
    return [];
  }

  // Parse header row
  const headers = parseCSVLine(lines[0]);

  // Parse data rows
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);

    // Create object from headers and values
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    rows.push(row);
  }

  return rows;
}

/**
 * Parses a single CSV line, handling quoted fields
 * @param {string} line - CSV line
 * @returns {Array<string>} Array of field values
 */
function parseCSVLine(line) {
  const fields = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        currentField += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      fields.push(currentField.trim());
      currentField = '';
    } else {
      currentField += char;
    }
  }

  // Add last field
  fields.push(currentField.trim());

  return fields;
}

/**
 * Checks if CSV file exists
 * @param {string} filepath - Path to CSV file
 * @returns {Promise<boolean>} True if file exists and is accessible
 */
export async function csvExists(filepath) {
  try {
    const response = await fetch(filepath, { method: 'HEAD', cache: 'no-cache' });
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Loads multiple CSV files for a season
 * @param {number} season - Season year
 * @returns {Promise<Object>} Object containing all loaded CSVs
 */
export async function loadSeasonData(season) {
  const basePath = 'data/canonical';

  try {
    const [drivers, constructors, races, driverStandings, constructorStandings] = await Promise.all([
      loadCSV(`${basePath}/drivers_${season}.csv`),
      loadCSV(`${basePath}/constructors_${season}.csv`),
      loadCSV(`${basePath}/races_${season}.csv`),
      loadCSV(`${basePath}/driver_standings_${season}.csv`),
      loadCSV(`${basePath}/constructor_standings_${season}.csv`)
    ]);

    // Try to load race results (optional - may not exist for upcoming seasons)
    let raceResults = [];
    try {
      raceResults = await loadCSV(`${basePath}/race_results_${season}.csv`);
      console.log(`[CSV Loader] ✓ Loaded ${raceResults.length} race results for ${season}`);
    } catch (error) {
      console.log(`[CSV Loader] ⚠️ No race results found for ${season} (pre-season or in progress)`);
    }

    // Try to load qualifying results (optional - may not exist for upcoming seasons)
    let qualifying = [];
    try {
      qualifying = await loadCSV(`${basePath}/qualifying_${season}.csv`);
      console.log(`[CSV Loader] ✓ Loaded ${qualifying.length} qualifying results for ${season}`);
    } catch (error) {
      console.log(`[CSV Loader] ⚠️ No qualifying results found for ${season} (pre-season or in progress)`);
    }

    // Try to load sprint results (optional - only exists for seasons/rounds with sprints)
    let sprintResults = [];
    try {
      sprintResults = await loadCSV(`${basePath}/sprint_results_${season}.csv`);
      console.log(`[CSV Loader] ✓ Loaded ${sprintResults.length} sprint results for ${season}`);
    } catch (error) {
      console.log(`[CSV Loader] ⚠️ No sprint results found for ${season} (no sprints yet or pre-season)`);
    }

    return {
      drivers,
      constructors,
      races,
      driverStandings,
      constructorStandings,
      raceResults,
      qualifying,
      sprintResults
    };
  } catch (error) {
    console.error(`[CSV Loader] Failed to load season ${season} data:`, error);
    throw error;
  }
}
