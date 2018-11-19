/**
 * @file index
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

export interface TaskHandler {
  config: TaskConfig,
  states: TransitionStates
}

export interface Transition {
  to: string,
  wait?: number
  done?: boolean
}

interface TaskMetadata {
  name: string
  uuid?: string | null
  error?: boolean | null
}

interface TaskState {
  [key: string]: any
}

export interface PendingTask {
  metadata: TaskMetadata,
  state: TaskState
}




export {TaskStats} from './TaskRunner'
export {PristineTask} from './PristineTask'
export {ErroredTask} from './ErroredTask'
export {ResumeTask} from './ResumeTask'
