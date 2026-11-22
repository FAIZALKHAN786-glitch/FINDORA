export function createStore(db) {
  const rows = async (text, params) => (await db.query(text, params)).rows;
  const insertItemSql = `insert into items (title, description, category, status, location, lost_found_date, photo_url, reporter_id, reporter_email, reporter_phone)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) returning *`;
  const itemParams = (data) => [data.title, data.description, data.category, data.status, data.location, data.lost_found_date, data.photo_url, data.reporter_id, data.reporter_email, data.reporter_phone];

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
    insertItem: async (data, embedding) => {
      if (!embedding) return rows(insertItemSql, itemParams(data)).then((found) => found[0]);
      const client = await db.connect();
      try {
        await client.query('begin');
        const item = (await client.query(insertItemSql, itemParams(data))).rows[0];
        await client.query(
          'insert into item_embeddings (item_id, model, embedding) values ($1, $2, $3)',
          [item.id, embedding.model, JSON.stringify(embedding.vector)],
        );
        await client.query('commit');
        return item;
      } catch (error) {
        await client.query('rollback');
        throw error;
      } finally {
        client.release();
      }
    },
    listMatchCandidates: (model) => rows(
      `select i.*, e.model, e.embedding
         from items i join item_embeddings e on e.item_id = i.id
        where i.status in ('lost', 'found') and e.model = $1
        order by i.created_at desc`,
      [model],
    ),
    listItemsNeedingEmbedding: (model) => rows(
      `select i.* from items i left join item_embeddings e on e.item_id = i.id
        where e.item_id is null or e.model <> $1`,
      [model],
    ),
    upsertEmbedding: (itemId, embedding) => rows(
      `insert into item_embeddings (item_id, model, embedding) values ($1, $2, $3)
       on conflict (item_id) do update set model = excluded.model, embedding = excluded.embedding, updated_at = now()`,
      [itemId, embedding.model, JSON.stringify(embedding.vector)],
    ),
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
