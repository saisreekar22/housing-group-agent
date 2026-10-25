insert into public.listings (
  sender_phone, sender_name, group_id, group_name, listing_type, rent_monthly,
  utilities_included, gender_preference, dietary_preference, location_text,
  normalized_location_text, move_in_date, move_out_date, private_room,
  private_bath, amenities, contact_phone, summary, source_message,
  latitude, longitude, posted_at
) values
(
  '16025550101', 'Maya R.', '120363000000000001@g.us', 'ASU Tempe Housing',
  'sublease', 780, false, 'female', 'veg', 'University House Tempe',
  'university house tempe', '2026-11-15', '2027-07-31', true, true,
  '{"pool": true, "gym": true, "study_room": true, "in_unit_laundry": true, "parking": null, "furnished": true}'::jsonb,
  '16025550101',
  'Private 1B1B sublease at University House Tempe, $780/mo, female veg preferred, furnished with pool and gym.',
  'Subleasing my private room + bath at University House Tempe from Nov 15 to July 31. $780/month plus utilities, female veg preferred. Fully furnished, pool, gym, study room, in-unit laundry. Text me if interested!',
  33.4153, -111.926, now() - interval '2 days'
),
(
  '16025550103', 'Sofia L.', '120363000000000002@g.us', 'Tempe Subleases & Roommates',
  'sublease', 950, true, 'mixed', null, 'Vista del Sol',
  'vista del sol', '2027-01-01', '2027-05-31', true, true,
  '{"pool": true, "gym": true, "study_room": true, "in_unit_laundry": true, "parking": true, "furnished": true}'::jsonb,
  '16025550103',
  'Spring sublease at Vista del Sol, $950/mo all utilities included, private room and bath, fully furnished.',
  'Spring sublease at Vista del Sol, Jan 1 - May 31. Private room and private bath, $950/month with all utilities included. Fully furnished unit with pool, gym, study room, laundry, and parking.',
  33.4248, -111.934, now() - interval '8 days'
),
(
  '16025550105', 'Neha S.', '120363000000000001@g.us', 'ASU Tempe Housing',
  'sublease', 690, false, 'female', 'veg', 'Paseo on University',
  'paseo on university', '2026-12-01', '2027-06-30', true, false,
  '{"pool": true, "gym": true, "study_room": null, "in_unit_laundry": true, "parking": null, "furnished": null}'::jsonb,
  '16025550105',
  'Female veg sublease at Paseo on University, $690/mo, private room, pool and gym.',
  'Sublease available at Paseo on University Dec 1 - June 30. Private room in a 3B3B, $690/month plus utilities. Female veg roommates. Pool, gym and laundry in unit.',
  33.4216, -111.9326, now() - interval '14 days'
),
(
  '16025550107', 'Aisha N.', '120363000000000001@g.us', 'ASU Tempe Housing',
  'sublease', 875, false, null, 'vegan', 'Nine20 Tempe',
  'nine20 tempe', '2027-01-01', '2027-07-15', true, true,
  '{"pool": true, "gym": null, "study_room": true, "in_unit_laundry": null, "parking": null, "furnished": true}'::jsonb,
  '16025550107',
  'Vegan-friendly sublease at Nine20 Tempe, $875/mo, private bath, furnished, pool and study rooms.',
  'Subleasing my room at Nine20 Tempe for spring and summer. $875/month plus utilities. Private bath, fully furnished, vegan household. Pool and study rooms in the building.',
  33.4188, -111.9388, now() - interval '21 days'
),
(
  '16025550109', 'Grace T.', '120363000000000002@g.us', 'Tempe Subleases & Roommates',
  'sublease', 1050, false, 'female', null, 'West 6th',
  'west 6th', '2027-01-01', '2027-07-31', true, true,
  '{"pool": true, "gym": true, "study_room": true, "in_unit_laundry": null, "parking": true, "furnished": true}'::jsonb,
  '16025550109',
  'Female sublease at West 6th, $1,050/mo, private bath, furnished, pool, gym and parking.',
  'Sublease at West 6th for spring semester. $1050/month plus utilities. Female unit, private room and bath, fully furnished. Pool, gym, study room, and reserved parking.',
  33.4244, -111.94, now() - interval '27 days'
),
(
  '16025550111', 'Camila D.', '120363000000000003@g.us', 'ASU Off-Campus',
  'sublease', 640, true, 'mixed', null, 'Vertex',
  'vertex', '2026-12-15', '2027-05-31', true, false,
  '{"pool": true, "gym": null, "study_room": null, "in_unit_laundry": true, "parking": true, "furnished": null}'::jsonb,
  '16025550111',
  'Affordable sublease at Vertex, $640/mo with utilities, pool, laundry and parking.',
  'Cheap sublease at Vertex from Dec 15 to May 31. $640/month including utilities. Private room in a mixed 2B2B. Pool, in-unit laundry, and free parking.',
  33.4147, -111.9279, now() - interval '34 days'
),
(
  '16025550113', 'Isabella F.', '120363000000000001@g.us', 'ASU Tempe Housing',
  'sublease', 760, false, 'female', 'veg', 'District on Apache',
  'district on apache', '2027-01-01', '2027-08-01', true, true,
  '{"pool": true, "gym": true, "study_room": null, "in_unit_laundry": null, "parking": null, "furnished": true}'::jsonb,
  '16025550113',
  'Female veg sublease at District on Apache, $760/mo, private bath, furnished with pool and gym.',
  'Sublease at District on Apache, January through August. $760/month plus utilities. Female veg apartment, private room and bath, furnished. Pool and 24/7 gym.',
  33.4145, -111.931, now() - interval '40 days'
),
(
  '16025550114', 'Liam C.', '120363000000000002@g.us', 'Tempe Subleases & Roommates',
  'lease_transfer', 995, true, null, null, 'Union Tempe',
  'union tempe', '2026-12-01', '2027-07-31', true, true,
  '{"pool": true, "gym": true, "study_room": true, "in_unit_laundry": true, "parking": true, "furnished": true}'::jsonb,
  '16025550114',
  'Premium lease transfer at Union Tempe, $995/mo all-inclusive, private bath, all amenities.',
  'Lease takeover at Union Tempe, Dec 1 - July 31. $995/month with utilities and internet included. Private room and bath, fully furnished. Pool, gym, study rooms, laundry, and garage parking.',
  33.4237, -111.9283, now() - interval '43 days'
)
on conflict (sender_phone, normalized_location_text, rent_monthly) do update set
  sender_name = excluded.sender_name,
  group_id = excluded.group_id,
  group_name = excluded.group_name,
  listing_type = excluded.listing_type,
  utilities_included = excluded.utilities_included,
  gender_preference = excluded.gender_preference,
  dietary_preference = excluded.dietary_preference,
  location_text = excluded.location_text,
  move_in_date = excluded.move_in_date,
  move_out_date = excluded.move_out_date,
  private_room = excluded.private_room,
  private_bath = excluded.private_bath,
  amenities = excluded.amenities,
  contact_phone = excluded.contact_phone,
  summary = excluded.summary,
  source_message = excluded.source_message,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  posted_at = excluded.posted_at,
  updated_at = now();
