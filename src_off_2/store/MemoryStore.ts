/**
 * @file MemoryStore
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

/**
 * @file FileStore
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */
// import Bluebird from 'bluebird'
import {Store} from "./Store"
import {v4} from 'uuid'
import {filter, first} from "lodash/fp";

export class MemoryStore implements Store {

  private Tasks: Map<string, any>

  constructor() {
    this.Tasks = new Map()
  }

  getAllTasks() {
    return this.Tasks
  }

  findOrCreateState(taskUuid: string, stateUuid: string, state: any | null) {
    let task = this.Tasks.get(taskUuid)
    let existingState = stateUuid ? task.states[stateUuid] : null
    if (existingState) {
      return Promise.resolve(existingState)
    }

    return this.createState(taskUuid, state)

  }

  createState(taskUuid: string, state: any): any {
    let uuid = v4()

    let stateObj = {
      uuid: uuid,
      state: state
    }

    let task = this.Tasks.get(taskUuid)
    task.states[uuid] = stateObj
    return Promise.resolve(stateObj)

  }

  getState(taskUuid: string, stateUuid: string): any {
    let task = this.Tasks.get(taskUuid)
    return Promise.resolve(task.states[stateUuid])
  }


  findOrCreateTask(taskName: string, taskUuid?: string): Promise<{ created: boolean, task: any }> {
    if (taskUuid && this.Tasks.has(taskUuid)) {
      let t = this.Tasks.get(taskUuid)
      return Promise.resolve({
        created: false,
        task: {
          name: t.name,
          uuid: t.uuid,
          complete: t.complete,
          error: t.error,
          currentTransition: t.currentTransition
        }
      })
    }
    return this.createTask(taskName)
      .then((t) => {
        return {
          created: true,
          task: t
        }
      })
  }

  createTask(taskName: string): Promise<any> {
    let uuid = v4()
    let td = {
      name: taskName,
      uuid: uuid,
      complete: false,
      error: false,
      currentTransition: 0,
      states: {},
      transitions: {}
    }

    this.Tasks.set(uuid, td)
    return Promise.resolve({
      name: td.name,
      uuid: td.uuid,
      complete: td.complete,
      error: td.error,
      currentTransition: td.currentTransition
    })

  }

  getTask(taskUuid: string): any {
    let task = this.Tasks.get(taskUuid)
    return Promise.resolve(task)
  }

  closeTask(taskUuid: string): any {
    let task = this.Tasks.get(taskUuid)
    task.complete = true
    this.Tasks.set(taskUuid, task)
    return Promise.resolve(true)
  }

  createTransition(taskUuid: string, transitionName: string, transitionNumber: number, stateUuid: string): any {
    let uuid = v4()
    let tr = {
      uuid: uuid,
      name: transitionName,
      row: transitionNumber,
      complete: false,
      error: null,
      startingState: stateUuid
    }
    let task = this.Tasks.get(taskUuid)
    task.currentTransition = transitionNumber
    task.transitions[uuid] = tr
    this.Tasks.set(taskUuid, task)
    return Promise.resolve(uuid)
  }

  getTransition(taskUuid: string, transitionUuid: string): any {
    let task = this.Tasks.get(taskUuid)
    let transition = task.transitions[transitionUuid]
    return Promise.resolve(transition)
  }

  closeTransition(taskUuid: string, transitionUuid: string, stateUuid: string, error?: Error) {
    let task = this.Tasks.get(taskUuid)
    let transition = task.transitions[transitionUuid]
    transition.endingState = stateUuid
    transition.error = error && error.stack || null
    transition.complete = !transition.error
    this.Tasks.set(taskUuid, task)
    return Promise.resolve(true)
  }

  getLastTransitionError(taskUuid: string): any {
    return this.getTask(taskUuid)
      .then((result) => {
        let errored = filter({complete: false}, result.transitions)
        return first(errored)
      })
  }


}