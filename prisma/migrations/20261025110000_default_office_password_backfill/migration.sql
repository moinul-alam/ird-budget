-- Offices whose login still carries the old default were never given a password of
-- their own: the hint says 12345 and the hash is the hash of 12345. Move those rows
-- onto the current default so what /admin/offices-users shows is what works.
UPDATE "office_users"
SET "password_hash" = '53d0afa337c1a3c8a857041ca5104e2666b538882425195f93b8d3f03c079ebd',
    "password_hint" = 'budget26',
    "updated_at"    = now()
WHERE "password_hint" = '12345'
  AND "password_hash" = '5994471abb01112afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5';
