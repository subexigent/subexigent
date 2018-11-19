exports.up = function(knex, Promise) {
      return knex.schema.createTable('state_transition', (t) => {
        t.increments('id').primary()
        t.dateTime('created_at').defaultTo(knex.raw('now()')).notNull();
        t.dateTime('updated_at').nullable();
        t.dateTime('deleted_at').nullable();
        t.uuid('uuid').defaultTo(knex.raw('uuid_generate_v4()'))
        t.integer('task_id').unsigned().notNull()
        t.foreign('task_id').references('task.id').onDelete('CASCADE').onUpdate('CASCADE')
        t.string('state_name')
        t.jsonb('initial_state').notNull()
      })


};

exports.down = function(knex, Promise) {
  return knex.schema.dropTableIfExists('state_transition')
};