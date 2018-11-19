/**
 * @file TaskHandler
 * @author Jim Bulkowski <jim.b@paperelectron.com>
 * @project exigency
 * @license MIT {@link http://opensource.org/licenses/MIT}
 */

interface TransitionStates {
  [key: string]: Function
}

interface TaskConfig {
  name: string
  initial: string
  retryOnError?: boolean
  retryDelay?: number,
  rolloffMultiplier?: number,
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
    this.config = task.config
    this.states = task.states
  }


  getName(){
    return this.config.name
  }

  getInitial(){
    return this.states[this.config.initial]
  }
}