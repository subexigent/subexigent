const {onUpdateTrigger} = require('../KnexFuns')
const table = 'subexigent_state'

exports.up = function(knex, Promise) {
      return knex.schema.createTable(table, (t) => {
        // t.increments('id').primary()
        t.uuid('uuid').defaultTo(knex.raw('uuid_generate_v4()')).primary()
        t.jsonb('state').notNull()
        t.uuid('task_uuid').notNull()
        t.foreign('task_uuid').references('subexigent_task.uuid').onDelete('CASCADE').onUpdate('CASCADE')
        t.timestamp('created_at').defaultTo(knex.fn.now()).notNull();
        t.timestamp('updated_at').defaultTo(knex.fn.now()).notNull()
        t.timestamp('ended_at')
        t.timestamp('deleted_at').nullable();
      })
        .then(() => {
          return knex.raw(onUpdateTrigger(table))
        })


};

exports.down = function(knex, Promise) {
  return knex.schema.dropTableIfExists('subexigent_state')
};