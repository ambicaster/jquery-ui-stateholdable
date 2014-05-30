(function($){

	$.widget('customui.stateholdable', {
		options: {
			initialState: null,
			persistent: true,
			usingBrowserHistory: true,
			extendingTop: true
		},

		_create: function() {

			this.prepared = {},
			this.state = [null],
			this.top = null;

			this.option(this.options);

			var self = this;
			this.element.addClass('ui-custom-stateholdable')
				.find(':customui-statechangable')
				.statechangable('option', 'connectWith', this.element);
			if(this.options.usingBrowserHistory || this.options.persistent) {
				var state = this._topState();
				if(state === null) { // 이전 state가 없을 때
					if(this.options.initialState) {
						this._replaceState(this.options.initialState);
						this.sendToChangable();
					} else {
						this.receiveFromChangable(true);
					}
				} else {
					this.sendToChangable();
				}
			} else if(this.options.initialState) {
				this._replaceState(this.options.initialState);
				this.sendToChangable();
			} else {
				this.receiveFromChangable(true);
			}

			if(this.options.usingBrowserHistory) {
				$(window).on('popstate', function(){
					var prev = self.top;
					self.sendToChangable();
					self._trigger('pop');
					var curr = self._topState();
					self._triggerChange(curr, prev);
					self.top = curr;
				});
			}
		},

		_setOption: function(key, value) {
			if(key === 'persistent' && !value) {
				this.options.usingBrowserHistory = undefined;
			}
			if(key === 'usingBrowserHistory') {
				this.options.persistent = value !== undefined;
			}
			this._super(key, value);
		},

		prepareState: function(key, value) {
			this._extendState(this.prepared, this._state(key, value));
		},

		clearPrepared: function() {
			this.prepared = {};
		},

		pushPrepared: function() {
			this._pushState(this.prepared);
			this.clearPrepared();
		},

		replacePrepared: function() {
			this._replaceState(this.prepared);
			this.clearPrepared();
		},

		pushState: function(key, value) {
			console.debug('pushState');
			var state = this._state(key, value);
			console.log('Push state:', this.element[0], '<=', state);
			this._pushState(state);
			this._trigger('push');
		},

		replaceState: function(key, value) {
			console.debug('replaceState');
			var state = this._state(key, value);
			console.log('Replace state:', this.element[0], '<=', state);
			this._replaceState(state);
			this._trigger('replace');
		},

		popState: function() {
			var top = this._popState();
			this._trigger('pop');
			var newTop = this._topState();
			this._triggerChange(newTop, top);
			this.top = newTop;
			return top;
		},

		topState: function(key) {
			return this._topState(key);
		},

		getStates: function() {
			return this._getStates();
		},

		clearState: function() {
			this._setState(null);
		},

		sendToChangable: function() {
			console.debug('sendToChangable');
			this._getConnected().statechangable('receiveState');
			this._trigger('send');
		},

		receiveFromChangable: function(replaceState) {
			console.debug('receiveFromChangable');
			var temp = this.prepared;
			this._getConnected().statechangable('sendPrepare');
			if(replaceState) {
				this.replacePrepared();
			} else {
				this.pushPrepared();
			}
			this.prepared = temp;
			this._trigger('receive');
		},

		_getConnected: function() {
			var self = this;
			return $(':customui-statechangable').filter(function(){
				var connectWith = $($(this).statechangable('option', 'connectWith'))[0];
				return connectWith && connectWith === self.element[0];
			});
		},

		_getStates: function () {
			return this.state;
		},

		_state: function(key, value) {
			var state = {};
			if(typeof key == 'string' && value !== undefined) {
				state[key] = value;
			} else if(key !== null && $.isPlainObject(key)) {
				state = key;
			}
			return state;
		},

		_extendState: function(target, state) {
			$.extend(target, state);
		},

		_pushState: function(st) {
			var top = this._topState();
			var state = st;
			if(this.options.extendingTop) {
				state = $.extend({}, top || {}, st);
				console.debug('_pushState', top, '+', st);
			} else {
				console.debug('_pushState', st);
			}
			if(this.options.usingBrowserHistory) {
				var newState = $.extend({}, history.state);
				newState[this._id()] = state;
				$.history.pushState(newState);
			} else if(this.options.persistent) {
				// TODO: use sessionStorage
			} else {
				this._getStates().push(state);
			}
			this._triggerChange(state, top);
			this.top = state;
		},

		_replaceState: function(st) {
			var top = this._topState();
			var state = st;
			if(this.options.extendingTop) {
				state = $.extend({}, top || {}, st);
				console.debug('_replaceState', top, '+', st);
			} else {
				console.debug('_replaceState', st);
			}
			if(this.options.usingBrowserHistory) {
				var newState = $.extend({}, history.state);
				newState[this._id()] = state;
				$.history.replaceState(newState);
			} else if(this.options.persistent) {

			} else {
				if(this._getStates().length > 0) {
					this._getStates()[this._getStates().length - 1] = state;
				} else {
					// FIXME: ERROR
				}
			}
			this._triggerChange(state, top);
			this.top = state;
		},

		_popState: function() {
			var top = this._topState();
			if(this.options.usingBrowserHistory) {
				history.back();
			} else if(this.options.persistent) {
				// TODO: use sessionStorage
			} else {
				this._getStates().pop();
			}
			return top;
		},

		_topState: function(key) {
			var state = null;
			if(this.options.usingBrowserHistory) {
				state = (history.state || {})[this._id()];
				if(state === undefined) {
					state = null;
				}
			} else if(this.options.persistent) {
				// TODO: use sessionStorage
			} else {
				if(this._getStates().length > 0) {
					state = this._getStates()[this._getStates().length - 1];
				}
			}
			if(!state) {
				return null;
			}
			if(key !== undefined) {
				if(state[key] === undefined) {
					return null;
				}
				return state[key];
			}
			return state;
		},

		_id: function() {
			var id = this.element.attr('id');
			if(!id) {
				throw 'Historyable Stateholdable must have ID attribute';
			}
			return id;
		},

		_triggerChange: function(curr, prev) {
			if(!this._sameState(curr, prev)) {
				this._trigger('change', null, {
					current: curr,
					previous: prev
				});
			}
		},

		// Each state must not be function or xml
		_sameState: function(state1, state2) {
			if(typeof state1 != typeof state2) {
				return false;
			}
			if(typeof state1 != 'object') {
				return state1 === state2;
			}
			if(state1 === null? state2 !== null: state2 === null) {
				return false;
			}
			for(var k in state1) {
				if(state2[k] === undefined) {
					return false;
				}
			}
			for(var k in state2) {
				if(state1[k] === undefined) {
					return false;
				}
			}
			for(var k in state1) {
				if(!sameState(state1[k], state2[k])) {
					return false;
				}
			}
			return true;
		},

	});

})(jQuery);