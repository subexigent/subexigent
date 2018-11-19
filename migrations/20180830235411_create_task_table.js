
exports.up = function(knex, Promise) {
  return knex.raw('create extension if not exists "uuid-ossp"')
    .then(() => {
      return knex.schema.createTable('task', (t) => {
        t.increments('id').primary()
        t.dateTime('created_at').defaultTo(knex.raw('now()')).notNull();
        t.dateTime('updated_at').nullable();
        t.dateTime('deleted_at').nullable();
        t.uuid('uuid').defaultTo(knex.raw('uuid_generate_v4()'))
      })
    })

};

exports.down = function(knex, Promise) {
  return knex.schema.dropTableIfExists('task').then(() => {
    return knex.raw('drop extension if exists "uuid-ossp"')
  })
};
