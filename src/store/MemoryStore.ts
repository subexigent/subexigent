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
import {Store, TaskUpdate} from "./Store"
import {pruneTaskRetVal} from "./StoreHelpers"
import {v4} from 'uuid'
import {sortBy, filter, first, last,has, each} from "lodash/fp";

// @ts-ignore
const uncappedeach = each.convert({cap: false})

export class MemoryStore implements Store {

  private Tasks: Map<string, any>

  constructor() {
    this.Tasks = new Map()
  }

  // getAllTasks() {
  //   return this.Tasks
  // }

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
        task: pruneTaskRetVal(t)
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
    let t = {
      name: taskName,
      uuid: uuid,
      complete: false,
      suspended: false,
      error: false,
      aborted: false,
      abortError: null,
      retryAttempts: 0,
      currentTransition: 0,
      states: {},
      transitions: {}
    }

    this.Tasks.set(uuid, t)
    return Promise.resolve(t)
  }

  getTask(taskUuid: string, allData: boolean): any {
    let task = this.Tasks.get(taskUuid)
    let retVal = allData ? task: pruneTaskRetVal(task)
    return Promise.resolve(retVal)
  }

  closeTask(taskUuid: string): any {
    let task = this.Tasks.get(taskUuid)
    task.complete = true
    this.Tasks.set(taskUuid, task)
    return Promise.resolve(true)
  }

  suspendTask(taskUuid: string, error?: Error | null): any {
    let task = this.Tasks.get(taskUuid)
    task.error = !!error
    this.Tasks.set(taskUuid, task)
    return Promise.resolve(true)
  }

  updateTask(taskUuid: string, updateData: TaskUpdate){
    return this.getTask(taskUuid, true)
      .then((data) => {
        uncappedeach((v,k) => {
          if(has(k, data)){
            let current = data[k]
            data[k] = v(current)
          }
        }, updateData)

        return Promise.resolve(true)
      })

  }

  createTransition(taskUuid: string, transitionName: string, transitionNumber: number, stateUuid: string): any {
    let uuid = v4()
    let tr = {
      uuid: uuid,
      name: transitionName,
      row: transitionNumber,
      complete: false,
      error: null,
      destination: null,
      wait: null,
      startingState: stateUuid,
      endingState: null
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

  closeTransition(taskUuid: string, transitionUuid: string, stateUuid: string, transitionDestination: any, error?: Error) {
    let task = this.Tasks.get(taskUuid)
    let transition = task.transitions[transitionUuid]
    transition.endingState = stateUuid
    transition.error = error && error.stack || null
    transition.destination = transitionDestination.to
    transition.complete = !transition.error
    this.Tasks.set(taskUuid, task)
    return Promise.resolve(true)
  }

  completeTransition(taskUuid: string, transitionUuid: string){
    let task = this.Tasks.get(taskUuid)
    let transition = task.transitions[transitionUuid]
    transition.complete = true
    this.Tasks.set(taskUuid, task)
    return Promise.resolve(true)
  }

  getLastTransition(taskUuid: string): any {
    return this.getTask(taskUuid, true)
      .then((result) => {
        return last(sortBy(['row'], result.transitions))
      })
  }


}