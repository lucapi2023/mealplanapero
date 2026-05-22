const CATEGORIES = {
  'vegetables': ['zucchin', 'melanzan', 'peperon', 'pomodor', 'carot', 'sedano', 'cipoll', 'aglio', 'broccol', 'asparag', 'spinac', 'cavol', 'lattuga', 'rucola', 'bietol', 'finocch', 'cetriol', 'barbabietol', 'mais', 'pisell', 'fagiolin', 'lenticch', 'fave', 'ceci', 'fagioli', 'patat', 'scalogno', 'cipollott', 'taccole', 'prezzemol', 'basilico', 'menta', 'timo', 'rosmarino', 'maggioran', 'erba cipollina', 'foglie'],
  'meat': ['manzo', 'vitell', 'maial', 'pancett', 'guancial', 'prosciutt', 'salsicci', 'pollo', 'tacchin', 'agnell', 'midollo', 'carne', 'bovin', 'cotto'],
  'fish': ['tonn', 'salmone', 'acciugh', 'gamber', 'scamp', 'merluz', 'branzin', 'orat', 'pesce', 'alici', 'bottarg', 'crostacei'],
  'pasta & grains': ['pasta', 'spaghett', 'penne', 'rigaton', 'fusill', 'farfal', 'tagliatell', 'riso', 'gnocch', 'farina', 'semol', 'pipe', 'sedani', 'mezze', 'ditalon', 'troccoli', 'carnaroli', 'arborio', 'vialone'],
  'dairy & eggs': ['formagg', 'parmigian', 'pecorin', 'mozzarell', 'ricott', 'burr', 'panna', 'latte', 'uova', 'yogurt', 'grana', 'talegg', 'gorgonzol', 'grovier', 'robiol'],
  'condiments & spices': ['olio', 'aceto', 'sale', 'pepe', 'zafferan', 'noce moscat', 'cannell', 'peperoncin', 'vino', 'brandy', 'succo', 'scorza', 'limon', 'dado', 'brodo'],
  'canned & jarred': ['passat', 'pelati', 'pomodori secch', 'tonn', 'acciugh', 'olive', 'capper'],
  'fruit & nuts': ['noci', 'mandorl', 'frutt', 'mela', 'per', 'aranc', 'limon', 'pistill'],
}

export function getCategory(ingredientName) {
  const name = ingredientName.toLowerCase()
  for (const [cat, keywords] of Object.entries(CATEGORIES)) {
    for (const kw of keywords) {
      if (name.includes(kw)) return cat
    }
  }
  return 'other'
}

export const CATEGORY_ORDER = ['vegetables', 'meat', 'fish', 'pasta & grains', 'dairy & eggs', 'condiments & spices', 'canned & jarred', 'fruit & nuts', 'other']
