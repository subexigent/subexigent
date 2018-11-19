/**
 * @file PgStore
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */
import Knex from 'knex'
import {Store} from "./Store"

export class PGStore implements Store {
  id: number
  uuid: string
  private client: Knex

  constructor(config: any) {
    this.client = Knex({
      client: 'pg',
      connection: {
        user: 'monstertke',
        host: 'postgres.jostle.pw',
        password: 'jailbird',
        database: 'extingency',
      },
      pool: {
        min: 2,
        max: 5,
      },
      debug: false
    })
  }

  getTask(){

  }
  getTransition(){

  }
  createTask(): any {
    return this.client('task')
      .insert({}, ['id', 'uuid'])
      .then((data) => {
        this.id = data[0].id
        this.uuid = data[0].uuid
        return this
      })
  }

  closeTask(taskUuid: string): any {
  }

  createTransition(taskUuid: string, transitionNumber: number, state: any): any {
    return this.client('state_transition')
      .insert({task_id: taskUuid}, 'id')
      .then(() => {
        return this
      })
  }

  closeTransition(taskUuid: string) {
  }
}