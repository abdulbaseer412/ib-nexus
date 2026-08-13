import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zdzeajqqxecyvvfrizmp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkemVhanFxeGVjeXZ2ZnJpem1wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDEzMDk5MiwiZXhwIjoyMDk5NzA2OTkyfQ.D8u--NUPHF8-ZRTHnjJF4GCF-t9UJdpgM09GVeN4toE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  // Get first user
  const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
  if (usersError || !usersData.users || usersData.users.length === 0) {
    console.error("No users found.", usersError);
    return;
  }
  const userId = usersData.users[0].id;
  console.log("Using User ID:", userId);

  // Insert a Manual Deck
  const { data: manualDeck, error: manualDeckErr } = await supabase
    .from('ib_flashcard_decks')
    .insert({
      user_id: userId,
      title: 'IB Biology HL - Unit 2: Molecular Biology',
      subject: 'Biology',
      topic: 'Molecular Biology'
    })
    .select()
    .single();

  if (manualDeckErr) {
    console.error("Error inserting manual deck:", manualDeckErr);
    return;
  }
  
  console.log("Created Manual Deck:", manualDeck.id);

  // Insert an AI-generated Deck
  const { data: aiDeck, error: aiDeckErr } = await supabase
    .from('ib_flashcard_decks')
    .insert({
      user_id: userId,
      title: '[AI] Economics - Microeconomics Key Terms',
      subject: 'Economics',
      topic: 'Microeconomics'
    })
    .select()
    .single();

  if (aiDeckErr) {
    console.error("Error inserting AI deck:", aiDeckErr);
    return;
  }
  
  console.log("Created AI Deck:", aiDeck.id);

  // Insert Cards for Manual Deck
  const manualCards = [
    {
      deck_id: manualDeck.id,
      user_id: userId,
      front: 'What type of bond forms between amino acids?',
      back: 'Peptide bond (a covalent bond formed by a condensation reaction).',
      is_ai_generated: false,
      status: 'New'
    },
    {
      deck_id: manualDeck.id,
      user_id: userId,
      front: 'Explain the difference between alpha-D-glucose and beta-D-glucose.',
      back: 'In alpha-D-glucose, the -OH group on carbon 1 is pointing downwards. In beta-D-glucose, it is pointing upwards.',
      is_ai_generated: false,
      status: 'Read'
    },
    {
      deck_id: manualDeck.id,
      user_id: userId,
      front: 'Outline the role of helicase in DNA replication.',
      back: 'Helicase unwinds the DNA double helix and separates the two strands by breaking hydrogen bonds.',
      is_ai_generated: false,
      status: 'Mastered'
    }
  ];

  await supabase.from('ib_flashcards').insert(manualCards);
  console.log("Inserted manual cards.");

  // Insert Cards for AI Deck
  const aiCards = [
    {
      deck_id: aiDeck.id,
      user_id: userId,
      front: 'Define Price Elasticity of Demand (PED).',
      back: 'A measure of the responsiveness of the quantity demanded of a good to a change in its price.',
      is_ai_generated: true,
      status: 'New'
    },
    {
      deck_id: aiDeck.id,
      user_id: userId,
      front: 'What is a negative externality of production?',
      back: 'When the production of a good or service imposes a negative effect on a third party (e.g., pollution). Marginal Social Cost > Marginal Private Cost.',
      is_ai_generated: true,
      status: 'New'
    }
  ];

  await supabase.from('ib_flashcards').insert(aiCards);
  console.log("Inserted AI cards.");
}

seed();
