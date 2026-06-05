export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { restaurant, city, whatToOrder, email } = req.body;

  if (!restaurant || !city) {
    return res.status(400).json({ error: 'Restaurant name and city are required' });
  }

  try {
    // Always create a contact first — GHL requires contactId on every opportunity
    const contactPayload = {
      locationId: process.env.GHL_LOCATION_ID,
      tags: ['restaurant-submission'],
      firstName: 'Submission',
      lastName: restaurant,
    };
    if (email) contactPayload.email = email;

    const contactRes = await fetch('https://services.leadconnectorhq.com/contacts/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GHL_OPPORTUNITIES_API_KEY}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28'
      },
      body: JSON.stringify(contactPayload)
    });
    const contactData = await contactRes.json();

    // Use new contact ID, or existing ID if duplicate
    const contactId = contactData?.contact?.id || contactData?.meta?.contactId;

    if (!contactId) {
      console.error('Failed to create contact:', contactData);
      return res.status(500).json({ error: 'Failed to create contact' });
    }

    // Create opportunity in Pirelli Visits pipeline
    const oppBody = {
      name: `${restaurant} — ${city}`,
      pipelineId: 'aweztHP3aoD7jZ85tuk2',
      pipelineStageId: '3cafb359-3f9a-4740-8e46-f13c558a0ee4',
      locationId: process.env.GHL_LOCATION_ID,
      status: 'open',
      contactId,
    };

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
