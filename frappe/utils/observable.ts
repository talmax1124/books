enum EventType {
  Listeners = '_listeners',
  OnceListeners = '_onceListeners',
}

export default class Observable {
  [key: string]: unknown;
  _isHot: Map<string, boolean>;
  _eventQueue: Map<string, unknown[]>;
  _map: Map<string, unknown>;
  _listeners: Map<string, Function[]>;
  _onceListeners: Map<string, Function[]>;

  constructor() {
    this._map = new Map();
    this._isHot = new Map();
    this._eventQueue = new Map();
    this._listeners = new Map();
    this._onceListeners = new Map();
  }

  /**
   * Getter to use Observable as a regular document.
   *
   * @param key
   * @returns
   */
  get(key: string): unknown {
    return this[key];
  }

  /**
   * Setter to use Observable as a regular document.
   *
   * @param key
   * @param value
   */
  set(key: string, value: unknown) {
    this[key] = value;
    this.trigger('change', {
      doc: this,
      fieldname: key,
    });
  }

  /**
   * Sets a `listener` that executes every time `event` is triggered
   *
   * @param event : name of the event for which the listener is set
   * @param listener : listener that is executed when the event is triggered
   */
  on(event: string, listener: Function) {
    this._addListener(EventType.Listeners, event, listener);
  }

  /**
   * Sets a `listener` that execture `once`: executes once when `event` is
   * triggered then deletes itself
   *
   * @param event : name of the event for which the listener is set
   * @param listener : listener that is executed when the event is triggered
   */
  once(event: string, listener: Function) {
    this._addListener(EventType.OnceListeners, event, listener);
  }

  /**
   * Remove a listener from an event for both 'on' and 'once'
   *
   * @param event : name of the event from which to remove the listener
   * @param listener : listener that was set for the event
   */
  off(event: string, listener: Function) {
    this._removeListener(EventType.Listeners, event, listener);
    this._removeListener(EventType.OnceListeners, event, listener);
  }

  /**
   * Remove all the listeners.
   */
  clear() {
    this._listeners.clear();
    this._onceListeners.clear();
  }

  /**
   * Triggers the event's listener function.
   *
   * @param event : name of the event to be triggered.
   * @param params : params to pass to the listeners.
   * @param throttle : wait time before triggering the event.
   */

  async trigger(event: string, params: unknown, throttle: number = 0) {
    let isHot = false;
    if (throttle > 0) {
      isHot = this._throttled(event, params, throttle);
      params = [params];
    }

    if (isHot) {
      return;
    }

    await this._executeTriggers(event, params);
  }

  _removeListener(type: EventType, event: string, listener: Function) {
    const listeners = (this[type].get(event) ?? []).filter(
      (l) => l !== listener
    );
    this[type].set(event, listeners);
  }

  async _executeTriggers(event: string, params?: unknown) {
    await this._triggerEvent(EventType.Listeners, event, params);
    await this._triggerEvent(EventType.OnceListeners, event, params);
    this._onceListeners.delete(event);
  }

  _throttled(event: string, params: unknown, throttle: number) {
    /**
     * Throttled events execute after `throttle` ms, during this period
     * isHot is true, i.e it's going to execute.
     */

    if (!this._eventQueue.has(event)) {
      this._eventQueue.set(event, []);
    }

    if (this._isHot.get(event)) {
      this._eventQueue.get(event)!.push(params);
      return true;
    }

    this._isHot.set(event, true);

    setTimeout(() => {
      this._isHot.set(event, false);

      const params = this._eventQueue.get(event);
      if (params !== undefined) {
        this._executeTriggers(event, params);
        this._eventQueue.delete(event);
      }
    }, throttle);

    return false;
  }

  _addListener(type: EventType, event: string, listener: Function) {
    this._initLiseners(type, event);
    this[type].get(event)!.push(listener);
  }

  _initLiseners(type: EventType, event: string) {
    if (this[type].has(event)) {
      return;
    }

    this[type].set(event, []);
  }

  async _triggerEvent(type: EventType, event: string, params?: unknown) {
    const listeners = this[type].get(event) ?? [];
    for (const listener of listeners) {
      await listener(params);
    }
  }
}
