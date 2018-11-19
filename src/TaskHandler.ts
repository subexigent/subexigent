/**
 * @file TaskHandler
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

import {getOr} from 'lodash/fp'

interface TransitionStates {
  [key: string]: Function
}

interface TaskConfig {
  name: string
  initial: string
  retryOnError?: boolean
  retryDelay?: number,
  delayMultiplier?: number,
  retryAttempts?: number
}

export interface Task {
  config: TaskConfig,
  states: TransitionStates
}

export class TaskHandler {
  config: TaskConfig
  states: TransitionStates

  constructor(task: Task){
    this.config = {
      name: task.config.name,
      initial: task.config.initial,
      retryOnError: getOr(true, 'config.retryOnError', task ),
      retryDelay: getOr(1000, 'config.retryDelay', task ),
      delayMultiplier: getOr(1.5, 'config.delayMultiplier', task ),
      retryAttempts: getOr(1, 'config.retryAttempts', task ),
    }

    this.states = task.states
  }


  getConfig(){
    return this.config
  }
  getName(){
    return this.config.name
  }

  getHandler(handler: any){
    return this.states[handler.to] || null
  }

  getInitial(){
    return {name: this.config.initial, handler: this.states[this.config.initial]}
  }
}