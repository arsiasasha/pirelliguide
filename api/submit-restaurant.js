export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { restaurant, city, whatToOrder, email } = req.body;

  if (!restaurant || !city) {
    return res.status(400).json({ error: 'Restaurant name and city are required' });
  }

  try {
    // Create or find contact first (required for opportunity)
    let contactId = null;
    if (email) {
      const contactRes = await fetch('https://services.leadconnectorhq.com/contacts/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GHL_OPPORTUNITIES_API_KEY}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28'
        },
        body: JSON.stringify({
          email,
          locationId: process.env.GHL_LOCATION_ID,
          tags: ['restaurant-submission']
        })
      });
      const contactData = await contactRes.json();
      contactId = contactData?.contact?.id || null;
    }

    // Create opportunity in Pirelli Visits pipeline
    const oppBody = {
      name: `${restaurant} — ${city}`,
      pipelineId: 'aweztHP3aoD7jZ85tuk2',
      pipelineStageId: '3cafb359-3f9a-4740-8e46-f13c558a0ee4',
      locationId: process.env.GHL_LOCATION_ID,
      status: 'open',
      notes: whatToOrder ? `What to order: ${whatToOrder}` : '',
    };

    if (contactId) oppBody.contactId = contactId;

    const oppRes = await fetch('https://services.leadconnectorhq.com/opportunities/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GHL_OPPORTUNITIES_API_KEY}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28'
      },
      body: JSON.stringify(oppBody)
    });

    if (!oppRes.ok) {
      const err = await oppRes.text();
      console.error('GHL opportunity error:', err);
      return res.status(500).json({ error: 'Failed to submit' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
