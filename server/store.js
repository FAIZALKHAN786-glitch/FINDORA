export function createStore(db) {
  const rows = async (text, params) => (await db.query(text, params)).rows;

  return {
    findUserByEmail: (email) => rows('select id, email, full_name, password_hash from users where email = $1', [email]).then((found) => found[0] || null),
    createUser: ({ email, fullName, passwordHash }) => rows(
      'insert into users (email, full_name, password_hash) values ($1, $2, $3) returning id, email, full_name',
      [email, fullName, passwordHash],
    ).then((found) => found[0]),

    createSession: (tokenHash, userId, expiresAt) => rows(
      'insert into sessions (token_hash, user_id, expires_at) values ($1, $2, $3)',
      [tokenHash, userId, expiresAt],
    ),
    findSessionUser: (tokenHash) => rows(
      `select u.id, u.email, u.full_name
         from sessions s join users u on u.id = s.user_id
        where s.token_hash = $1 and s.expires_at > now()`,
      [tokenHash],
    ).then((found) => found[0] || null),
    deleteSession: (tokenHash) => db.query('delete from sessions where token_hash = $1', [tokenHash]),

    findItem: (id) => rows('select * from items where id = $1', [id]).then((found) => found[0] || null),
    listItems: ({ q, category, status } = {}) => {
      const clauses = [];
      const params = [];
      if (q) {
        params.push(`%${q}%`);
        clauses.push(`(i.title ilike $${params.length} or i.description ilike $${params.length} or i.location ilike $${params.length})`);
      }
      if (category) {
        params.push(category);
        clauses.push(`i.category = $${params.length}`);
      }
      if (status) {
        params.push(status);
        clauses.push(`i.status = $${params.length}`);
      }
      const where = clauses.length ? `where ${clauses.join(' and ')}` : '';
      return rows(`select i.*, u.full_name as reporter_name from items i left join users u on u.id = i.reporter_id ${where} order by i.created_at desc`, params);
    },
    insertItem: (data) => rows(
      `insert into items (title, description, category, status, location, lost_found_date, photo_url, reporter_id, reporter_email, reporter_phone)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) returning *`,
      [data.title, data.description, data.category, data.status, data.location, data.lost_found_date, data.photo_url, data.reporter_id, data.reporter_email, data.reporter_phone],
    ).then((found) => found[0]),
    claimItem: (id, userId) => rows(
      `update items set status = 'claimed', updated_at = now()
        where id = $1 and reporter_id = $2 and status in ('lost', 'found') returning *`,
      [id, userId],
    ).then((found) => found[0] || null),
    deleteItem: (id, userId) => rows(
      'delete from items where id = $1 and reporter_id = $2 returning *',
      [id, userId],
    ).then((found) => found[0] || null),
  };
}
