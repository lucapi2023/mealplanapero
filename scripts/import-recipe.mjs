#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import WebSocket from 'ws'
import readline from 'readline'

const SUPABASE_URL = 'https://oghvlybiodahacdlcxyg.supabase.co'
const SUPABASE_KEY = 'sb_publishable__4hZvrkyxAJ2-bVqw6nVWQ_nT5izI1R'

const RECIPES = [

  // 1. Gnocchi alla sorrentina
  {
    title: 'Gnocchi alla sorrentina', protein_type: 'vegetarian', effort_level: 'medium',
    prep_time_min: 30, cook_time_min: 40, servings_base: 4, is_core: true,
    instructions: "Lessare le patate per 30-40 min. Soffriggere aglio in olio, aggiungere passata, salare, unire basilico e cuocere 30 min. Setacciare farina a fontana, schiacciare le patate calde al centro, unire uovo e sale. Impastare velocemente. Formare bigoli di 2-3 cm, tagliare a gnocchi e rigare. Lessare in acqua salata: scolare appena salgono a galla. Condire a strati in pirofila: sugo, gnocchi, mozzarella a dadini, parmigiano. Gratinare in forno statico a 250°C in modalità grill per 5 minuti. Servire caldi.",
    ingredients: [
      { name: 'Patate rosse', amount: 250, unit: 'g' }, { name: 'Farina 00', amount: 75, unit: 'g' },
      { name: 'Uova', amount: 0.3, unit: 'piece' }, { name: 'Sale fino', amount: 1, unit: 'g' },
      { name: 'Semola', amount: 10, unit: 'g' }, { name: 'Passata di pomodoro', amount: 150, unit: 'g' },
      { name: 'Basilico', amount: 1.5, unit: 'foglie' }, { name: 'Aglio', amount: 0.3, unit: 'spicchio' },
      { name: 'Olio extravergine d\'oliva', amount: 10, unit: 'ml' }, { name: 'Mozzarella', amount: 62.5, unit: 'g' },
      { name: 'Parmigiano Reggiano DOP', amount: 17.5, unit: 'g' },
    ]
  },

  // 2. Spaghetti all'Amatriciana
  {
    title: "Spaghetti all'Amatriciana", protein_type: 'meat', effort_level: 'low',
    prep_time_min: 10, cook_time_min: 25, servings_base: 4, is_core: true,
    instructions: "Tagliare il guanciale a listarelle, rosolarlo in padella di ferro senza olio per 7-8 minuti fino a che il grasso diventa trasparente. Sfumare con vino bianco, alzare la fiamma e lasciar evaporare. Trasferire il guanciale in un piatto. Nella stessa padella mettere il peperoncino e i pomodori pelati sfilacciati a mano. Cuocere 10 minuti a fiamma moderata. Cuocere gli spaghetti al dente, scolarli e saltarli nel sugo con il guanciale. Servire con abbondante Pecorino Romano DOP grattugiato.",
    ingredients: [
      { name: 'Spaghetti', amount: 80, unit: 'g' }, { name: 'Pomodori pelati', amount: 100, unit: 'g' },
      { name: 'Guanciale', amount: 37.5, unit: 'g' }, { name: 'Pecorino Romano DOP', amount: 18.8, unit: 'g' },
      { name: 'Vino bianco', amount: 12.5, unit: 'g' }, { name: 'Peperoncino fresco', amount: 0.3, unit: 'piece' },
    ]
  },

  // 3. Pasta alla gricia
  {
    title: 'Pasta alla gricia', protein_type: 'meat', effort_level: 'low',
    prep_time_min: 10, cook_time_min: 20, servings_base: 4, is_core: true,
    instructions: "Tagliare il guanciale a listarelle e rosolarlo in padella calda per 10 minuti. Mettere da parte il guanciale. Cuocere i rigatoni 2-3 minuti in meno del tempo indicato. Versare un mestolo di acqua di cottura nella padella per creare un'emulsione. Scolare i rigatoni nella padella, ultimare la cottura mescolando. Fuori dal fuoco aggiungere il Pecorino a pioggia, diluire con acqua di cottura calda. Unire il guanciale, mescolare e servire con pepe macinato.",
    ingredients: [
      { name: 'Rigatoni', amount: 80, unit: 'g' }, { name: 'Guanciale', amount: 62.5, unit: 'g' },
      { name: 'Pecorino Romano DOP', amount: 15, unit: 'g' },
    ]
  },

  // 4. Pasta e lenticchie
  {
    title: 'Pasta e lenticchie', protein_type: 'meat', effort_level: 'low',
    prep_time_min: 20, cook_time_min: 50, servings_base: 4, is_core: false,
    instructions: "Preparare il brodo vegetale. Tritare cipolla, sedano e carota. Soffriggere in olio con aglio. Unire pancetta a cubetti e rosolare. Sciacquare le lenticchie e unirle al soffritto con peperoncino, passata di pomodoro, rosmarino e timo. Coprire con brodo e cuocere 40 minuti. Eliminare le erbe, unire la pasta, aggiungere brodo per portare a cottura. Mantecare con Parmigiano Reggiano DOP grattugiato.",
    ingredients: [
      { name: 'Ditaloni Rigati', amount: 87.5, unit: 'g' }, { name: 'Lenticchie', amount: 50, unit: 'g' },
      { name: 'Pancetta affumicata', amount: 20, unit: 'g' }, { name: 'Passata di pomodoro', amount: 25, unit: 'g' },
      { name: 'Carote', amount: 20, unit: 'g' }, { name: 'Cipolle', amount: 20, unit: 'g' },
      { name: 'Sedano', amount: 15, unit: 'g' }, { name: 'Brodo vegetale', amount: 250, unit: 'ml' },
      { name: 'Aglio', amount: 0.3, unit: 'spicchio' }, { name: 'Parmigiano Reggiano DOP', amount: 10, unit: 'g' },
      { name: 'Olio extravergine d\'oliva', amount: 7.5, unit: 'g' },
    ]
  },

  // 5. Pasta alla Norma
  {
    title: 'Pasta alla Norma', protein_type: 'vegetarian', effort_level: 'low',
    prep_time_min: 25, cook_time_min: 60, servings_base: 6, is_core: true,
    instructions: "Tagliare le melanzane a fette, salare e lasciar spurgare 15 minuti. Cuocere i pomodori con aglio, sale e basilico per 30 minuti. Passare al passaverdure e cuocere altri 40 minuti con aglio e basilico. Friggere le melanzane in olio a 170-180°C. Cuocere la pasta al dente, scolarla e saltarla nel sugo. Servire con melanzane fritte, abbondante ricotta salata grattugiata e basilico fresco.",
    ingredients: [
      { name: 'Sedani Rigati', amount: 83.3, unit: 'g' }, { name: 'Melanzane', amount: 0.2, unit: 'piece' },
      { name: 'Ricotta di pecora', amount: 25, unit: 'g' }, { name: 'Pomodori costoluti', amount: 250, unit: 'g' },
      { name: 'Aglio', amount: 0.7, unit: 'spicchi' }, { name: 'Basilico', amount: 0.2, unit: 'mazzetto' },
      { name: 'Olio extravergine d\'oliva', amount: 30, unit: 'ml' },
    ]
  },

  // 6. Pasta e zucchine
  {
    title: 'Pasta e zucchine', protein_type: 'vegan', effort_level: 'low',
    prep_time_min: 5, cook_time_min: 15, servings_base: 4, is_core: false,
    instructions: "Grattugiare le zucchine. Soffriggere aglio in olio, unire le zucchine, salare e pepare. Cuocere 5-6 minuti mescolando. Sfumare con acqua bollente. Eliminare l'aglio, profumare con basilico. Cuocere i fusilli al dente, scolarli e trasferirli nella padella. Proseguire la cottura con acqua di cottura per cremosità. Mantecare con un filo d'olio a crudo.",
    ingredients: [
      { name: 'Fusilli', amount: 80, unit: 'g' }, { name: 'Zucchine', amount: 162.5, unit: 'g' },
      { name: 'Aglio', amount: 0.3, unit: 'spicchio' }, { name: 'Olio extravergine d\'oliva', amount: 10, unit: 'ml' },
      { name: 'Basilico', amount: 2, unit: 'foglie' },
    ]
  },

  // 7. Mezze maniche al tonno
  {
    title: 'Mezze maniche al tonno', protein_type: 'fish', effort_level: 'low',
    prep_time_min: 10, cook_time_min: 15, servings_base: 4, is_core: false,
    instructions: "Soffriggere aglio in olio, rimuoverlo. Sciogliere le acciughe con acqua di cottura. Unire peperoncino a listarelle. Sgocciolare il tonno dall'olio e versarlo in padella. Aggiungere passata di pomodoro e cuocere 10 minuti. Lessare la pasta al dente e scolarla direttamente nel sugo. Insaporire con prezzemolo tritato.",
    ingredients: [
      { name: 'Mezze Maniche Rigate', amount: 80, unit: 'g' }, { name: 'Tonno sott\'olio', amount: 62.5, unit: 'g' },
      { name: 'Passata di pomodoro', amount: 100, unit: 'g' }, { name: 'Acciughe sott\'olio', amount: 3.8, unit: 'g' },
      { name: 'Aglio', amount: 0.3, unit: 'spicchio' }, { name: 'Prezzemolo', amount: 0.3, unit: 'ciuffo' },
      { name: 'Olio extravergine d\'oliva', amount: 10, unit: 'g' },
    ]
  },

  // 8. Pasta al salmone
  {
    title: 'Pasta al salmone', protein_type: 'fish', effort_level: 'low',
    prep_time_min: 10, cook_time_min: 20, servings_base: 4, is_core: false,
    instructions: "Tagliare il salmone a striscioline. Tritare cipolla e prezzemolo. Soffriggere la cipolla in olio, unire il salmone e saltare a fiamma alta. Sfumare con brandy e lasciar evaporare. Spegnere il fuoco, versare la panna. Cuocere le tagliatelle, scolarle e trasferirle nella padella. Riaccendere il fuoco, mescolare per restringere il condimento. Completare con prezzemolo e pepe.",
    ingredients: [
      { name: 'Tagliatelle all\'uovo', amount: 80, unit: 'g' }, { name: 'Salmone affumicato', amount: 100, unit: 'g' },
      { name: 'Panna fresca liquida', amount: 50, unit: 'g' }, { name: 'Brandy', amount: 12.5, unit: 'g' },
      { name: 'Cipolle dorate', amount: 0.1, unit: 'piece' }, { name: 'Olio extravergine d\'oliva', amount: 10, unit: 'ml' },
      { name: 'Prezzemolo', amount: 2, unit: 'g' },
    ]
  },

  // 9. Spaghetti con le acciughe e il pangrattato
  {
    title: 'Spaghetti con le acciughe e il pangrattato', protein_type: 'fish', effort_level: 'low',
    prep_time_min: 5, cook_time_min: 25, servings_base: 4, is_core: false,
    instructions: "Soffriggere aglio e acciughe in olio con un mestolo di acqua calda per 10 minuti. Tostare il pangrattato in padella a parte con olio. Cuocere gli spaghetti 5 minuti, scolarli e trasferirli nella padella con le acciughe. Risottare aggiungendo acqua di cottura. Spegnere, aggiungere la panure tostata e mescolare. Servire con altra panure sopra.",
    ingredients: [
      { name: 'Spaghetti', amount: 80, unit: 'g' }, { name: 'Acciughe sott\'olio', amount: 7.5, unit: 'g' },
      { name: 'Pangrattato', amount: 17.5, unit: 'g' }, { name: 'Aglio', amount: 0.8, unit: 'spicchi' },
      { name: 'Olio extravergine d\'oliva', amount: 5, unit: 'g' },
    ]
  },

  // 10. Pasta fredda
  {
    title: 'Pasta fredda', protein_type: 'meat', effort_level: 'low',
    prep_time_min: 20, cook_time_min: 20, servings_base: 4, is_core: false,
    instructions: "Tagliare le zucchine a tocchetti e saltarle in padella con olio per 5 minuti. Unire i piselli, cuocere 1 minuto. Cuocere la pasta al dente. Dividere i pomodorini a metà, tagliare le olive a rondelle. Scolare la pasta e lasciarla raffreddare con un filo d'olio. Unire mais, olive, zucchine e piselli intiepiditi, prosciutto a cubetti, mozzarelline, pomodorini e basilico spezzettato. Mescolare e condire con olio.",
    ingredients: [
      { name: 'Fusilli', amount: 80, unit: 'g' }, { name: 'Zucchine', amount: 75, unit: 'g' },
      { name: 'Pomodorini ciliegino', amount: 62.5, unit: 'g' }, { name: 'Mozzarelline ciliegine', amount: 37.5, unit: 'g' },
      { name: 'Mais', amount: 35, unit: 'g' }, { name: 'Prosciutto cotto', amount: 30, unit: 'g' },
      { name: 'Pisellini', amount: 25, unit: 'g' }, { name: 'Olive nere', amount: 15, unit: 'g' },
      { name: 'Olio extravergine d\'oliva', amount: 10, unit: 'g' },
    ]
  },

  // 11. Pasta ai 4 formaggi
  {
    title: 'Pasta ai 4 formaggi', protein_type: 'vegetarian', effort_level: 'low',
    prep_time_min: 10, cook_time_min: 15, servings_base: 4, is_core: false,
    instructions: "Cuocere le pennette. Grattugiare il groviera, tagliare il taleggio a cubetti, ridurre il gorgonzola a pezzetti. Scaldare il latte in una casseruola fino a sfiorare il bollore. Unire gorgonzola, taleggio e groviera mescolando per scioglierli. Spegnere il fuoco e aggiungere il Parmigiano Reggiano DOP grattugiato con pepe bianco. Scolare la pasta al dente e trasferirla direttamente nella crema di formaggi. Mescolare e servire.",
    ingredients: [
      { name: 'Pennette Rigate', amount: 80, unit: 'g' }, { name: 'Taleggio', amount: 20, unit: 'g' },
      { name: 'Parmigiano Reggiano DOP', amount: 20, unit: 'g' }, { name: 'Gorgonzola', amount: 25, unit: 'g' },
      { name: 'Groviera', amount: 20, unit: 'g' }, { name: 'Latte intero', amount: 45, unit: 'g' },
    ]
  },

  // 12. Spaghetti al pomodoro
  {
    title: 'Spaghetti al pomodoro', protein_type: 'vegan', effort_level: 'low',
    prep_time_min: 10, cook_time_min: 70, servings_base: 4, is_core: true,
    instructions: "Soffriggere aglio diviso a metà in olio per 2 minuti. Unire i pomodori pelati, salare. Coprire e cuocere a fuoco molto basso per 1 ora mescolando di tanto in tanto. Eliminare l'aglio, passare i pomodori al passaverdure. Rimettere il sugo in padella a fuoco basso con basilico. Cuocere gli spaghetti al dente, scolarli e saltarli nel sugo. Servire con basilico fresco.",
    ingredients: [
      { name: 'Spaghetti', amount: 80, unit: 'g' }, { name: 'Pomodori pelati', amount: 200, unit: 'g' },
      { name: 'Olio extravergine d\'oliva', amount: 7.5, unit: 'g' }, { name: 'Aglio', amount: 0.3, unit: 'spicchio' },
    ]
  },

  // 13. Pasta panna e prosciutto
  {
    title: 'Pasta panna e prosciutto', protein_type: 'meat', effort_level: 'low',
    prep_time_min: 5, cook_time_min: 15, servings_base: 4, is_core: false,
    instructions: "Tagliare il prosciutto cotto a listarelle. Soffriggere aglio in olio, unire il prosciutto e rosolare 4 minuti fino a doratura. Cuocere le penne al dente. Unire la panna al prosciutto, aromatizzare con noce moscata, cuocere 2 minuti. Eliminare l'aglio. Scolare la pasta e trasferirla nella padella. Spegnere il fuoco, aggiungere prezzemolo tritato e Parmigiano Reggiano DOP grattugiato. Mescolare con acqua di cottura per cremosità.",
    ingredients: [
      { name: 'Penne Rigate', amount: 80, unit: 'g' }, { name: 'Prosciutto cotto', amount: 50, unit: 'g' },
      { name: 'Panna fresca liquida', amount: 62.5, unit: 'g' }, { name: 'Parmigiano Reggiano DOP', amount: 12.5, unit: 'g' },
      { name: 'Aglio', amount: 0.3, unit: 'spicchio' }, { name: 'Olio extravergine d\'oliva', amount: 5, unit: 'ml' },
    ]
  },

  // 14. Pasta con broccoli
  {
    title: 'Pasta con broccoli', protein_type: 'vegetarian', effort_level: 'low',
    prep_time_min: 10, cook_time_min: 30, servings_base: 4, is_core: false,
    instructions: "Staccare le cimette dei broccoli e sciacquarle. Lessarle in acqua salata per 10 minuti. Soffriggere aglio in olio. Scolare i broccoli (tenere l'acqua) e trasferirli in pentola con l'aglio. Tenere qualche cimetta da parte. Cuocere i broccoli con poca acqua per 20 minuti fino a ridurli in crema. Cuocere la pasta nell'acqua dei broccoli. Unire le cimette tenute da parte. Scolare la pasta e saltarla nella crema di broccoli con acqua di cottura per cremosità.",
    ingredients: [
      { name: 'Troccoli freschi', amount: 80, unit: 'g' }, { name: 'Broccoli', amount: 112.5, unit: 'g' },
      { name: 'Aglio', amount: 0.3, unit: 'spicchio' }, { name: 'Olio extravergine d\'oliva', amount: 10, unit: 'ml' },
    ]
  },

  // 15. Pasta e patate
  {
    title: 'Pasta e patate', protein_type: 'vegan', effort_level: 'low',
    prep_time_min: 15, cook_time_min: 30, servings_base: 4, is_core: true,
    instructions: "Pelare le patate, tagliarle a cubetti. Tritare scalogno e rosmarino. Soffriggere scalogno e rosmarino in olio. Unire le patate e cuocere per 20 minuti aggiungendo acqua bollente al bisogno. Cuocere la pasta, scolarla al dente e trasferirla nel tegame con le patate. Mescolare e finire la cottura con acqua di cottura per creare la cremina. Insaporire con timo, pepe e un filo d'olio a crudo.",
    ingredients: [
      { name: 'Pipe Rigate', amount: 62.5, unit: 'g' }, { name: 'Patate', amount: 175, unit: 'g' },
      { name: 'Scalogno', amount: 10, unit: 'g' }, { name: 'Olio extravergine d\'oliva', amount: 7.5, unit: 'g' },
    ]
  },

  // 16. Spaghetti al limone
  {
    title: 'Spaghetti al limone', protein_type: 'vegetarian', effort_level: 'low',
    prep_time_min: 5, cook_time_min: 15, servings_base: 4, is_core: false,
    instructions: "Grattugiare la scorza di limone e spremerne il succo. Cuocere gli spaghetti. In una ciotola emulsionare olio, succo di limone, scorza, Parmigiano e un mestolo di acqua di cottura. Scolare la pasta al dente e saltarla nella crema al limone. Servire con basilico o prezzemolo.",
    ingredients: [
      { name: 'Spaghetti', amount: 80, unit: 'g' }, { name: 'Limoni', amount: 0.5, unit: 'piece' },
      { name: 'Parmigiano Reggiano DOP', amount: 15, unit: 'g' }, { name: 'Olio extravergine d\'oliva', amount: 10, unit: 'ml' },
    ]
  },

  // 17. Penne al ragù di verdure
  {
    title: 'Penne al ragù di verdure', protein_type: 'vegetarian', effort_level: 'medium',
    prep_time_min: 15, cook_time_min: 45, servings_base: 4, is_core: false,
    instructions: "Tritare finemente carota, sedano, cipolla. Soffriggere in olio. Aggiungere le verdure a dadini (zucchine, peperoni, melanzane) e cuocere 10 minuti. Unire passata di pomodoro e cuocere a fuoco lento per 30 minuti. Cuocere le penne al dente, scolarle e condire con il ragù di verdure. Servire con Parmigiano.",
    ingredients: [
      { name: 'Penne Rigate', amount: 80, unit: 'g' }, { name: 'Carote', amount: 25, unit: 'g' },
      { name: 'Sedano', amount: 25, unit: 'g' }, { name: 'Cipolle', amount: 25, unit: 'g' },
      { name: 'Zucchine', amount: 50, unit: 'g' }, { name: 'Peperoni', amount: 50, unit: 'g' },
      { name: 'Melanzane', amount: 50, unit: 'g' }, { name: 'Passata di pomodoro', amount: 100, unit: 'g' },
      { name: 'Olio extravergine d\'oliva', amount: 10, unit: 'ml' }, { name: 'Parmigiano Reggiano DOP', amount: 10, unit: 'g' },
    ]
  },

  // 18. Pasta alla zozzona
  {
    title: 'Pasta alla zozzona', protein_type: 'meat', effort_level: 'medium',
    prep_time_min: 15, cook_time_min: 30, servings_base: 4, is_core: false,
    instructions: "Rosolare guanciale a listarelle. Unire salsiccia sbriciolata e rosolare. Sfumare con vino bianco. Aggiungere pomodori pelati e cuocere 15 minuti. Cuocere i rigatoni, scolarli al dente. Fuori dal fuoco aggiungere tuorli d'uovo sbattuti con Pecorino, mescolando velocemente per creare cremosità senza far rapprendere l'uovo. Servire subito.",
    ingredients: [
      { name: 'Rigatoni', amount: 80, unit: 'g' }, { name: 'Guanciale', amount: 37.5, unit: 'g' },
      { name: 'Salsiccia', amount: 50, unit: 'g' }, { name: 'Pomodori pelati', amount: 100, unit: 'g' },
      { name: 'Tuorli', amount: 0.5, unit: 'piece' }, { name: 'Pecorino Romano DOP', amount: 15, unit: 'g' },
      { name: 'Vino bianco', amount: 12.5, unit: 'g' },
    ]
  },

  // 19. Farfalle al salmone affumicato
  {
    title: 'Farfalle al salmone affumicato', protein_type: 'fish', effort_level: 'low',
    prep_time_min: 10, cook_time_min: 15, servings_base: 4, is_core: false,
    instructions: "Soffriggere cipolla tritata in olio. Unire il salmone affumicato a striscioline e saltare 2 minuti. Aggiungere panna e cuocere 3 minuti. Cuocere le farfalle al dente, scolarle e saltarle nel condimento. Profumare con aneto o prezzemolo e servire.",
    ingredients: [
      { name: 'Farfalle', amount: 80, unit: 'g' }, { name: 'Salmone affumicato', amount: 75, unit: 'g' },
      { name: 'Panna fresca liquida', amount: 50, unit: 'g' }, { name: 'Cipolle dorate', amount: 0.3, unit: 'piece' },
      { name: 'Olio extravergine d\'oliva', amount: 10, unit: 'ml' },
    ]
  },

  // 20. Pasta gorgonzola e noci
  {
    title: 'Pasta gorgonzola e noci', protein_type: 'vegetarian', effort_level: 'low',
    prep_time_min: 5, cook_time_min: 15, servings_base: 4, is_core: false,
    instructions: "Sciogliere il gorgonzola in un pentolino con la panna a fuoco dolce. Cuocere la pasta. Scolare la pasta e condirla con la crema di gorgonzola. Aggiungere le noci tritate grossolanamente e mescolare. Servire con pepe nero.",
    ingredients: [
      { name: 'Penne Rigate', amount: 80, unit: 'g' }, { name: 'Gorgonzola', amount: 50, unit: 'g' },
      { name: 'Panna fresca liquida', amount: 40, unit: 'g' }, { name: 'Noci', amount: 15, unit: 'g' },
    ]
  },

  // 21. Pasta panna e asparagi
  {
    title: 'Pasta panna e asparagi', protein_type: 'vegetarian', effort_level: 'low',
    prep_time_min: 10, cook_time_min: 20, servings_base: 4, is_core: false,
    instructions: "Pulire gli asparagi eliminando la parte dura. Tagliarli a tocchetti. Soffriggere scalogno in olio, unire gli asparagi e cuocere 10 minuti con poca acqua. Aggiungere la panna e cuocere altri 5 minuti. Cuocere la pasta, scolarla e saltarla nel condimento. Mantecare con Parmigiano Reggiano DOP grattugiato.",
    ingredients: [
      { name: 'Farfalle', amount: 80, unit: 'g' }, { name: 'Asparagi', amount: 100, unit: 'g' },
      { name: 'Panna fresca liquida', amount: 40, unit: 'g' }, { name: 'Scalogno', amount: 0.3, unit: 'piece' },
      { name: 'Parmigiano Reggiano DOP', amount: 10, unit: 'g' }, { name: 'Olio extravergine d\'oliva', amount: 10, unit: 'ml' },
    ]
  },

  // 22. Rigatoni con pesto di pomodori secchi
  {
    title: 'Rigatoni con pesto di pomodori secchi', protein_type: 'vegetarian', effort_level: 'low',
    prep_time_min: 10, cook_time_min: 15, servings_base: 4, is_core: false,
    instructions: "Nel mixer frullare pomodori secchi sgocciolati, mandorle, Parmigiano, aglio, basilico e olio fino a ottenere un pesto cremoso. Cuocere i rigatoni al dente, scolarli tenendo da parte l'acqua di cottura. Condire la pasta con il pesto, allungando con acqua di cottura se necessario. Servire con scaglie di Parmigiano.",
    ingredients: [
      { name: 'Rigatoni', amount: 80, unit: 'g' }, { name: 'Pomodori secchi sott\'olio', amount: 30, unit: 'g' },
      { name: 'Mandorle', amount: 10, unit: 'g' }, { name: 'Parmigiano Reggiano DOP', amount: 15, unit: 'g' },
      { name: 'Aglio', amount: 0.3, unit: 'spicchio' }, { name: 'Olio extravergine d\'oliva', amount: 10, unit: 'ml' },
    ]
  },

  // 23. Risotto alla parmigiana
  {
    title: 'Risotto alla parmigiana', protein_type: 'vegetarian', effort_level: 'low',
    prep_time_min: 5, cook_time_min: 25, servings_base: 4, is_core: true,
    instructions: "Tritare finemente la cipolla. Stufare in olio per 3-4 minuti, aggiungere brodo e cuocere 5-6 minuti. Versare il riso, tostarlo e cuocere aggiungendo brodo caldo un mestolo alla volta per circa 15 minuti. Spegnere il fuoco e mantecare con Parmigiano Reggiano DOP grattugiato e burro a tocchetti. Mescolare, far riposare un minuto e servire con pepe nero.",
    ingredients: [
      { name: 'Riso Carnaroli', amount: 80, unit: 'g' }, { name: 'Brodo di carne', amount: 250, unit: 'ml' },
      { name: 'Cipolle bianche', amount: 0.3, unit: 'piece' }, { name: 'Parmigiano Reggiano DOP', amount: 20, unit: 'g' },
      { name: 'Burro', amount: 12.5, unit: 'g' }, { name: 'Olio extravergine d\'oliva', amount: 15, unit: 'ml' },
    ]
  },

  // 24. Pasta e ricotta
  {
    title: 'Pasta e ricotta', protein_type: 'vegetarian', effort_level: 'low',
    prep_time_min: 10, cook_time_min: 15, servings_base: 4, is_core: false,
    instructions: "Cuocere i fusilli in acqua salata. Setacciare la ricotta in una ciotola con un colino a maglie strette per renderla liscia. Aggiungere Parmigiano grattugiato, panna fresca, foglioline di timo, sale e pepe. Scolare la pasta al dente conservando acqua di cottura, versarla nella ciotola con il composto di ricotta e mescolare, allungando con acqua di cottura se necessario.",
    ingredients: [
      { name: 'Fusilli', amount: 80, unit: 'g' }, { name: 'Ricotta vaccina', amount: 87.5, unit: 'g' },
      { name: 'Parmigiano Reggiano DOP', amount: 17.5, unit: 'g' }, { name: 'Panna fresca liquida', amount: 17.5, unit: 'g' },
    ]
  },

  // 25. Risotto allo zafferano
  {
    title: 'Risotto allo zafferano', protein_type: 'vegetarian', effort_level: 'low',
    prep_time_min: 10, cook_time_min: 30, servings_base: 4, is_core: true,
    instructions: "Mettere i pistilli di zafferano in infusione in acqua per almeno 6 ore. Tritare finemente la cipolla, appassirla in olio per 10-15 minuti a fuoco minimo. Tostare il riso, sfumare con vino bianco. Cuocere aggiungendo brodo caldo un mestolo per volta. A metà cottura unire lo zafferano con il suo liquido. Terminata la cottura, spegnere e mantecare con burro freddo e Grana Padano DOP grattugiato. Aggiungere poco brodo per la giusta consistenza.",
    ingredients: [
      { name: 'Riso Carnaroli', amount: 80, unit: 'g' }, { name: 'Zafferano in pistilli', amount: 0.3, unit: 'cucchiaino' },
      { name: 'Cipolle dorate', amount: 0.1, unit: 'piece' }, { name: 'Vino bianco', amount: 10, unit: 'g' },
      { name: 'Brodo vegetale', amount: 250, unit: 'ml' }, { name: 'Grana Padano DOP', amount: 20, unit: 'g' },
      { name: 'Burro', amount: 18.8, unit: 'g' },
    ]
  },

  // 26. Risotto con zucchine
  {
    title: 'Risotto con zucchine', protein_type: 'vegetarian', effort_level: 'low',
    prep_time_min: 15, cook_time_min: 20, servings_base: 4, is_core: false,
    instructions: "Tritare finemente la cipolla, appassirla in olio per 10 minuti. Tostare il riso, sfumare con vino bianco. Cuocere aggiungendo brodo caldo. Grattugiare le zucchine a maglie larghe, aggiungerle a metà cottura. Spegnere, aggiungere menta spezzettata, pepe, burro freddo e Parmigiano grattugiato. Mantecare con poco brodo e far riposare coperto qualche minuto.",
    ingredients: [
      { name: 'Riso Carnaroli', amount: 80, unit: 'g' }, { name: 'Zucchine', amount: 87.5, unit: 'g' },
      { name: 'Cipolle bianche', amount: 20, unit: 'g' }, { name: 'Vino bianco', amount: 25, unit: 'g' },
      { name: 'Burro', amount: 12.5, unit: 'g' }, { name: 'Parmigiano Reggiano DOP', amount: 17.5, unit: 'g' },
      { name: 'Brodo vegetale', amount: 250, unit: 'ml' }, { name: 'Menta', amount: 1.3, unit: 'foglie' },
    ]
  },

  // 27. Risotto limone e gamberetti
  {
    title: 'Risotto limone e gamberetti', protein_type: 'fish', effort_level: 'low',
    prep_time_min: 10, cook_time_min: 30, servings_base: 4, is_core: false,
    instructions: "Sbollentare i gamberetti sgusciati per 2 minuti, scolarli. Tritare grossolanamente metà dei gamberi. Prelevare scorza e succo di limone. Tostare il riso nel burro, sfumare con vino bianco, aggiungere il succo di limone. Cuocere con brodo vegetale. A fine cottura unire i gamberi tritati e la scorza di limone. Spegnere, mantecare con burro. Servire decorando con gamberi interi, zest di limone ed erba cipollina.",
    ingredients: [
      { name: 'Riso Carnaroli', amount: 87.5, unit: 'g' }, { name: 'Succo di limone', amount: 0.3, unit: 'piece' },
      { name: 'Scorza di limone', amount: 0.1, unit: 'piece' }, { name: 'Gamberetti', amount: 100, unit: 'g' },
      { name: 'Brodo vegetale', amount: 250, unit: 'ml' }, { name: 'Burro', amount: 10, unit: 'g' },
      { name: 'Vino bianco', amount: 0.1, unit: 'bicchiere' },
    ]
  },

  // 28. Risotto al telefono
  {
    title: 'Risotto al telefono', protein_type: 'vegetarian', effort_level: 'low',
    prep_time_min: 10, cook_time_min: 25, servings_base: 4, is_core: false,
    instructions: "Tritare lo scalogno, appassirlo in olio. Tostare il riso, unire la passata di pomodoro. Cuocere aggiungendo brodo vegetale per circa 18 minuti. Tagliare la mozzarella a cubetti. A cottura ultimata spegnere, aggiungere mozzarella, un filo d'olio e maggiorana. Mescolare fino a che il formaggio si scioglie creando l'effetto filante.",
    ingredients: [
      { name: 'Riso vialone nano', amount: 80, unit: 'g' }, { name: 'Scalogno', amount: 0.3, unit: 'piece' },
      { name: 'Passata di pomodoro', amount: 50, unit: 'g' }, { name: 'Mozzarella', amount: 30, unit: 'g' },
      { name: 'Brodo vegetale', amount: 375, unit: 'ml' }, { name: 'Olio extravergine d\'oliva', amount: 10, unit: 'ml' },
    ]
  },

  // 29. Risotto alle carote
  {
    title: 'Risotto alle carote', protein_type: 'vegetarian', effort_level: 'low',
    prep_time_min: 10, cook_time_min: 18, servings_base: 4, is_core: false,
    instructions: "Pelare e tagliare le carote a cubetti. Affettare il cipollotto. Sciogliere il burro, unire cipollotto e carote, stufare 10 minuti con brodo. Prelevare una parte del soffritto e frullarlo con brodo. Tostare il riso nel soffritto rimasto. Cuocere aggiungendo brodo. Tagliare il taleggio a cubetti. A fine cottura unire la crema di carote frullata. Fuori dal fuoco aggiungere il taleggio, coprire 1-2 minuti, poi pepare e aggiungere timo.",
    ingredients: [
      { name: 'Riso Carnaroli', amount: 100, unit: 'g' }, { name: 'Carote', amount: 95, unit: 'g' },
      { name: 'Taleggio', amount: 37.5, unit: 'g' }, { name: 'Cipollotto fresco', amount: 17.5, unit: 'g' },
      { name: 'Burro', amount: 10, unit: 'g' }, { name: 'Brodo vegetale', amount: 250, unit: 'ml' },
    ]
  },

  // 30. Risotto alla barbabietola
  {
    title: 'Risotto alla barbabietola', protein_type: 'vegetarian', effort_level: 'low',
    prep_time_min: 5, cook_time_min: 20, servings_base: 4, is_core: false,
    instructions: "Frullare 220g di barbabietola con brodo fino a purea. Rosolare lo scalogno in olio, tostare il riso 3 minuti, sfumare con vino bianco. Cuocere con brodo. Dopo 10 minuti aggiungere metà purea di barbabietola. Dopo 5 minuti aggiungere il resto. A fine cottura mantecare con olio. Servire con cubetti di barbabietola fresca, fiocchi di yogurt greco e timo.",
    ingredients: [
      { name: 'Riso Carnaroli', amount: 80, unit: 'g' }, { name: 'Barbabietole precotte', amount: 65, unit: 'g' },
      { name: 'Yogurt greco', amount: 25, unit: 'g' }, { name: 'Brodo vegetale', amount: 250, unit: 'ml' },
      { name: 'Vino bianco secco', amount: 7.5, unit: 'g' }, { name: 'Scalogno', amount: 0.3, unit: 'piece' },
      { name: 'Olio extravergine d\'oliva', amount: 7.5, unit: 'g' }, { name: 'Timo', amount: 0.5, unit: 'rametti' },
    ]
  },

  // 31. Risotto agli asparagi e scampi
  {
    title: 'Risotto agli asparagi e scampi', protein_type: 'fish', effort_level: 'low',
    prep_time_min: 20, cook_time_min: 35, servings_base: 4, is_core: false,
    instructions: "Pulire gli scampi: staccare teste e code, estrarre la carne, eliminare l'intestino. Preparare il fumetto con i carapaci, verdure (carota, sedano, cipolla), vino bianco e acqua: rosolare 5 min, sfumare, coprire d'acqua e cuocere 10 min, filtrare. Rosolare gli scampi a pezzetti in padella. Pulire gli asparagi, tagliarli a rondelle, rosolarli. Tostare il riso, cuocere con il fumetto. Dopo 5 minuti aggiungere gli asparagi. A fine cottura mantecare con scampi e olio.",
    ingredients: [
      { name: 'Riso Carnaroli', amount: 80, unit: 'g' }, { name: 'Asparagi', amount: 100, unit: 'g' },
      { name: 'Scampi', amount: 200, unit: 'g' }, { name: 'Olio extravergine d\'oliva', amount: 2.5, unit: 'g' },
      { name: 'Carote', amount: 0.3, unit: 'piece' }, { name: 'Sedano', amount: 0.3, unit: 'costa' },
      { name: 'Cipolle bianche', amount: 0.3, unit: 'piece' }, { name: 'Vino bianco', amount: 12.5, unit: 'g' },
    ]
  },

  // 32. Risotto alla paesana
  {
    title: 'Risotto alla paesana', protein_type: 'meat', effort_level: 'low',
    prep_time_min: 20, cook_time_min: 35, servings_base: 4, is_core: false,
    instructions: "Preparare il brodo vegetale. Tagliare a cubetti piccoli carote, sedano e cipolla. Rosolare la pancetta a cubetti, unire il soffritto e cuocere a fuoco dolce. Sbollentare e sbucciare le fave. Tagliare le zucchine a cubetti e i pomodori a cubetti (senza semi). Unire pomodori e zucchine al soffritto, rosolare 5 minuti. Tostare il riso, coprire con brodo e cuocere 15 minuti. A metà cottura unire fave e piselli. Mantecare con olio e Grana Padano DOP grattugiato. Guarnire con basilico.",
    ingredients: [
      { name: 'Riso Arborio', amount: 80, unit: 'g' }, { name: 'Fave', amount: 62.5, unit: 'g' },
      { name: 'Pisellini', amount: 50, unit: 'g' }, { name: 'Pomodori ramati', amount: 50, unit: 'g' },
      { name: 'Zucchine', amount: 25, unit: 'g' }, { name: 'Carote', amount: 25, unit: 'g' },
      { name: 'Sedano', amount: 25, unit: 'g' }, { name: 'Cipolle', amount: 25, unit: 'g' },
      { name: 'Pancetta', amount: 12.5, unit: 'g' }, { name: 'Brodo vegetale', amount: 250, unit: 'ml' },
      { name: 'Grana Padano DOP', amount: 25, unit: 'g' }, { name: 'Olio extravergine d\'oliva', amount: 10, unit: 'ml' },
    ]
  },

  // 33. Risotto primavera
  {
    title: 'Risotto primavera', protein_type: 'vegetarian', effort_level: 'low',
    prep_time_min: 15, cook_time_min: 25, servings_base: 4, is_core: false,
    instructions: "Tritare il cipollotto e appassirlo in olio con poco brodo. Tagliare le zucchine a tocchetti, spuntare e tagliare i fagiolini, tagliare le taccole, sgranare i piselli. Tostare il riso, bagnare con brodo vegetale. Sbollentare le verdure preparate, passarle in acqua ghiacciata e scolarle. Unire il cipollotto appassito e le zucchine crude al risotto. A cottura quasi ultimata aggiungere le verdure sbollentate. Mantecare con burro e servire con Parmigiano grattugiato e pepe.",
    ingredients: [
      { name: 'Riso Carnaroli', amount: 80, unit: 'g' }, { name: 'Zucchine', amount: 0.5, unit: 'piece' },
      { name: 'Fagiolini', amount: 62.5, unit: 'g' }, { name: 'Taccole', amount: 37.5, unit: 'g' },
      { name: 'Piselli', amount: 25, unit: 'g' }, { name: 'Cipollotti', amount: 0.3, unit: 'piece' },
      { name: 'Brodo vegetale', amount: 250, unit: 'ml' }, { name: 'Burro', amount: 10, unit: 'g' },
      { name: 'Parmigiano Reggiano', amount: 20, unit: 'g' },
    ]
  },

  // 34. Risotto con piselli freschi
  {
    title: 'Risotto con piselli freschi', protein_type: 'vegetarian', effort_level: 'low',
    prep_time_min: 10, cook_time_min: 20, servings_base: 4, is_core: false,
    instructions: "Appassire lo scalogno tritato in olio. Unire i piselli freschi, insaporire 2 minuti, aggiungere brodo e cuocere 10 minuti. Frullare metà dei piselli con poco brodo fino a crema. Tostare il riso in olio, sfumare con vino bianco. Cuocere aggiungendo brodo. Dopo 10 minuti incorporare la crema di piselli. Verso fine cottura aggiungere i piselli interi. Fuori dal fuoco mantecare con burro, Parmigiano e scorza di limone grattugiata. Servire con foglie di menta fresca.",
    ingredients: [
      { name: 'Riso Arborio', amount: 90, unit: 'g' }, { name: 'Piselli', amount: 100, unit: 'g' },
      { name: 'Scalogno', amount: 0.3, unit: 'piece' }, { name: 'Brodo vegetale', amount: 250, unit: 'ml' },
      { name: 'Vino bianco', amount: 0.1, unit: 'bicchiere' }, { name: 'Burro', amount: 10, unit: 'g' },
      { name: 'Parmigiano grattugiato', amount: 12.5, unit: 'g' }, { name: 'Scorza di limone', amount: 0.3, unit: 'piece' },
      { name: 'Menta', amount: 2, unit: 'foglie' }, { name: 'Olio di oliva', amount: 10, unit: 'ml' },
    ]
  },

  // 35. Risotto alla milanese
  {
    title: 'Risotto alla milanese', protein_type: 'meat', effort_level: 'low',
    prep_time_min: 30, cook_time_min: 25, servings_base: 4, is_core: true,
    instructions: "Estrarre il midollo dalle ossa di bue. Tritare la cipolla. Rosolare la cipolla in metà burro a fuoco dolce. Unire il midollo e farlo sciogliere lentamente. Tostare il riso. Sciogliere lo zafferano in un mestolo di brodo. Cuocere il riso aggiungendo brodo poco alla volta. A 5 minuti dalla fine aggiungere lo zafferano sciolto. Mantecare fuori dal fuoco con il burro restante a cubetti e Grana Padano grattugiato. Decorare con pistilli di zafferano.",
    ingredients: [
      { name: 'Riso Carnaroli', amount: 80, unit: 'g' }, { name: 'Brodo di carne', amount: 150, unit: 'ml' },
      { name: 'Midollo di bovino', amount: 15, unit: 'g' }, { name: 'Burro', amount: 12.5, unit: 'g' },
      { name: 'Grana Padano', amount: 12.5, unit: 'g' }, { name: 'Cipolla', amount: 0.3, unit: 'piece' },
      { name: 'Zafferano', amount: 0.1, unit: 'bustina' },
    ]
  },

]

async function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => rl.question(question, answer => { rl.close(); resolve(answer) }))
}

async function main() {
  const email = process.env.MEALPLAN_EMAIL || await prompt('Email: ')
  const password = process.env.MEALPLAN_PASSWORD || await prompt('Password: ')

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    realtime: { transport: WebSocket },
  })

  console.log('\nSigning in...')
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password })
  if (authError) { console.error('Login failed:', authError.message); process.exit(1) }

  const user = authData.user
  console.log('Authenticated as:', user.email)

  const { data: pref } = await supabase.from('preferences').select('household_id').eq('user_id', user.id).maybeSingle()
  if (!pref?.household_id) { console.error('No household found.'); process.exit(1) }
  const householdId = pref.household_id

  for (const recipe of RECIPES) {
    console.log(`\nInserting: ${recipe.title}...`)

    const { data: newRecipe, error: recErr } = await supabase.from('recipes').insert({
      user_id: user.id, household_id: householdId,
      title: recipe.title, protein_type: recipe.protein_type,
      effort_level: recipe.effort_level, prep_time_min: recipe.prep_time_min,
      cook_time_min: recipe.cook_time_min, servings_base: recipe.servings_base,
      is_core: recipe.is_core, instructions: recipe.instructions,
    }).select().single()

    if (recErr || !newRecipe) { console.error('  Recipe insert failed:', recErr?.message); continue }
    console.log(`  Recipe created (${newRecipe.id.slice(0, 8)}...)`)

    if (recipe.ingredients.length > 0) {
      const names = recipe.ingredients.map(i => i.name)
      const { data: existing } = await supabase.from('ingredients').select('id, name').in('name', names).eq('household_id', householdId)
      const existingMap = {}
      if (existing) existing.forEach(i => { existingMap[i.name] = i.id })

      const missingNames = names.filter(n => !existingMap[n])
      if (missingNames.length > 0) {
        const inserts = missingNames.map(name => ({ name, user_id: user.id, household_id: householdId }))
        const { data: created } = await supabase.from('ingredients').insert(inserts).select('id, name')
        if (created) created.forEach(i => { existingMap[i.name] = i.id })
        console.log(`  Created ${created?.length || 0} new ingredients`)
      }

      const riRows = recipe.ingredients
        .filter(i => existingMap[i.name])
        .map(i => ({ recipe_id: newRecipe.id, ingredient_id: existingMap[i.name], amount: i.amount, unit: i.unit }))
      if (riRows.length > 0) {
        const { error: riErr } = await supabase.from('recipe_ingredients').insert(riRows)
        if (riErr) console.error('  Ingredients insert failed:', riErr.message)
        else console.log(`  Added ${riRows.length} ingredients`)
      }
    }
  }

  await supabase.auth.signOut()
  console.log('\nDone! All 35 recipes imported.')
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
