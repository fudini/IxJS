    /**
     * Provides a set of methods to create and query Enumerable sequences.
     */
    var Enumerable = root.Enumerable = (function () {
        function Enumerable(getEnumerator) {
            this.getEnumerator = getEnumerator;
        }

        var EnumerablePrototype = Enumerable.prototype;

        function aggregate (seed, func, resultSelector) {
            resultSelector || (resultSelector = identity);
            var accumulate = seed, enumerator = this.getEnumerator(), i = 0;
            try {
                while (enumerator.moveNext()) {
                    accumulate = func(accumulate, enumerator.getCurrent(), i++, this);
                }
            } finally {
                enumerator.dispose();
            }
            return resultSelector ? resultSelector(accumulate) : accumulate;         
        }

        function aggregate1 (func) {
            var accumulate, enumerator = this.getEnumerator(), i = 0;
            try {
                if (!enumerator.moveNext()) {
                    throw new Error(seqNoElements);
                }
                accumulate = enumerator.getCurrent();
                while (enumerator.moveNext()) {
                    accumulate = func(accumulate, enumerator.getCurrent(), i++, this);
                }
            } catch (e) { 
                throw e;
            } finally {
                enumerator.dispose();
            }
            return accumulate;
        }

        /**
         * Applies an accumulator function over a sequence. The specified seed value is used as the initial accumulator value, and the optional function is used to select the result value.
         * 
         * @example
         * sequence.aggregate(0, function (acc, item, index, seq) { return acc + x; });
         * sequence.aggregate(function (acc, item, index, seq) { return acc + x; });
         *
         * @param {Any} seed The initial accumulator value.
         * @param {Function} func An accumulator function to be invoked on each element.
         * @resultSelector {Function} A function to transform the final accumulator value into the result value.
         * @return {Any} The transformed final accumulator value.
         */
        EnumerablePrototype.aggregate = function(/* seed, func, resultSelector */) {
            var f = arguments.length === 1 ? aggregate1 : aggregate;
            return f.apply(this, arguments);
        };

        /**
         * Apply a function against an accumulator and each value of the sequence (from left-to-right) as to reduce it to a single value.
         *
         * @example
         * sequence.reduce(function (acc, x) { return acc + x; }, 0);
         * sequence.reduce(function (acc, x) { return acc + x; });
         *
         * @param {Function} func Function to execute on each value in the sequence, taking four arguments:
         *  previousValue The value previously returned in the last invocation of the callback, or initialValue, if supplied. 
         *  currentValue The current element being processed in the sequence.
         *  index The index of the current element being processed in the sequence.
         *  sequence The sequence reduce was called upon.
         * @param initialValue Object to use as the first argument to the first call of the callback.
         * @return The transformed final accumulator value.
         */
        EnumerablePrototype.reduce = function (/*func, seed */) {
            return arguments.length === 2 ? 
                aggregate.call(this, arguments[1], arguments[0]) :
                aggregate1.apply(this, arguments);
        };

        /**
         * Determines whether all elements of a sequence satisfy a condition.
         *
         * @example
         * sequence.all(function (item, index, seq) { return item % 2 === 0; });
         *
         * @param {Function} predicate A function to test each element for a condition.
         * @return {Boolean} true if every element of the source sequence passes the test in the specified predicate, or if the sequence is empty; otherwise, false.
         */
        EnumerablePrototype.all = EnumerablePrototype.every = function (predicate, thisArg) {
            var enumerator = this.getEnumerator(), i = 0;
            try {
                while (enumerator.moveNext()) {
                    if (!predicate.call(thisArg, enumerator.getCurrent(), i++, this)) {
                        return false;
                    }
                }
            } catch (e) {
                throw e;
            } finally {
                enumerator.dispose();
            }
            return true;
        }; 

        EnumerablePrototype.every = EnumerablePrototype.all;

        /**
         * Determines whether any element of a sequence satisfies a condition if given, else if any items are in the sequence.
         *
         * @example
         * sequence.any(function (item, index, seq) { return x % 2 === 0; });
         * sequence.any();
         *
         * @param {Function} [predicate] An optional function to test each element for a condition.
         * @return {Boolean} true if any elements in the source sequence pass the test in the specified predicate; otherwise, false.
         */
        EnumerablePrototype.any = function(predicate, thisArg) {
            var enumerator = this.getEnumerator(), i = 0;
            try {
                while (enumerator.moveNext()) {
                    if (!predicate || predicate.call(thisArg, enumerator.getCurrent(), i++, this)) {
                        return true;
                    }
                }
            } catch(e) {
                throw e;
            } finally {
                enumerator.dispose();
            }
            return false;   
        }; 

        EnumerablePrototype.some = EnumerablePrototype.any;

        /** 
         * Computes the average of a sequence of values that are obtained by invoking a transform function on each element of the input sequence.
         *
         * @param {Function} [selector] An optional transform function to apply to each element.
         * @return {Number} The average of the sequence of values.
         */
        EnumerablePrototype.average = function(selector) {
            if (selector) {
                return this.select(selector).average();
            }
            var enumerator = this.getEnumerator(), count = 0, sum = 0;
            try {
                while (enumerator.moveNext()) {
                    count++;
                    sum += enumerator.getCurrent();
                }
            } catch (e) {
                throw e;                
            } finally {
                enumerator.dispose();
            }
            if (count === 0) {
                throw new Error(seqNoElements);
            }
            return sum / count;
        };

        /** 
         * Concatenates two sequences.
         * 
         * @return {Enumerable} An Enumerable that contains the concatenated elements of the two input sequences.
         */
        EnumerablePrototype.concat = function () {
            var args = slice.call(arguments, 0);
            args.unshift(this);
            return enumerableConcat.apply(null, args);
        };

        /**
         * Determines whether a sequence contains a specified element by using an optional comparer function
         *
         * @param {Any} value The value to locate in the sequence.
         * @param {Function} [comparer] An equality comparer function to compare values.
         * @returns {Boolean} true if the source sequence contains an element that has the specified value; otherwise, false.
         */
        EnumerablePrototype.contains = function(value, comparer) {
            comparer || (comparer = defaultEqualityComparer); 
            var enumerator = this.getEnumerator();
            try {
                while (enumerator.moveNext()) {
                    if (comparer(value, enumerator.getCurrent())) {
                        return true;
                    }
                }
            } catch (e) {
                throw e;                
            } finally {
                enumerator.dispose();
            }
            return false;
        };

        /**
         * Returns a number that represents how many elements in the specified sequence satisfy a condition if specified, else the number of items in the sequence.
         *
         * @example
         * sequence.count();
         * sequence.count(function (item, index, seq) { return item % 2 === 0; });
         *
         * @param {Function} [predicate] A function to test each element for a condition.
         * @returns {Number} A number that represents how many elements in the sequence satisfy the condition in the predicate function if specified, else number of items in the sequence.
         */
        EnumerablePrototype.count = function(predicate, thisArg) {
            var c = 0, i = 0, enumerator = this.getEnumerator();
            try {
                while (enumerator.moveNext()) {
                    if (!predicate || predicate.call(thisArg, enumerator.getCurrent(), i++, this)) {
                        c++;
                    }
                }
            } catch (e) {
                throw e;
            } finally {
                enumerator.dispose();
            }
            return c;       
        };

        /**
         * Returns the elements of the specified sequence or the specified value in a singleton collection if the sequence is empty.
         *
         * @param {Any} [defaultValue] The value to return if the sequence is empty.
         * @returns {Enumerable} An Enumerable that contains defaultValue if source is empty; otherwise, source.
         */
        EnumerablePrototype.defaultIfEmpty = function(defaultValue) {
            var parent = this;
            return new Enumerable(function () {
                var current, isFirst = true, hasDefault = false, e;
                return enumeratorCreate(
                    function () {
                        e || (e = parent.getEnumerator());

                        if (hasDefault) { return false; }
                        if (isFirst) {
                            isFirst = false;
                            if (!e.moveNext()) {
                                current = defaultValue;            
                                hasDefault = true;
                                return true;
                            } else {
                                current = e.getCurrent();
                                return true;
                            }
                        }
                        if (!e.moveNext()) { return false; }
                        current = e.getCurrent();
                        return true;
                    },
                    function () { return current; },
                    function () { e && e.dispose(); }
                );
            });
        };

        function arrayIndexOf (item, comparer) {
            comparer || (comparer = defaultEqualityComparer);
            var idx = this.length;
            while (idx--) {
                if (comparer(this[idx], item)) {
                    return idx;
                }
            }
            return -1;
        }

        function arrayRemove(item, comparer) {
            var idx = arrayIndexOf.call(this, item, comparer);
            if (idx === -1) { 
                return false;
            }
            this.splice(idx, 1);
            return true;
        }
        
        /**
         * Returns distinct elements from a sequence by using a specified comparer function to compare values.
         *
         * @param {Function} comparer a comparer function to compare the values.
         * @returns {Enumerable} An Enumerable that contains distinct elements from the source sequence.
         */
        EnumerablePrototype.distinct = function(comparer) {
            comparer || (comparer = defaultEqualityComparer);
            var parent = this;
            return new Enumerable(function () {
                var current, map = [], enumerator;
                return enumeratorCreate(
                    function () {
                        enumerator || (enumerator = parent.getEnumerator());
                        while (true) {
                            if (!enumerator.moveNext()) {
                                return false;
                            }
                            current = enumerator.getCurrent();
                            if (arrayIndexOf.call(map, current, comparer) === -1) {
                                map.push(current);
                                return true;
                            }
                        }
                    },
                    function () { return current; },
                    function () { enumerator.dispose(); }
                );
            });
        };

        /**
         * Returns the element at a specified index in a sequence.
         *
         * @param {Number} index The zero-based index of the element to retrieve.
         * @returns {Any} The element at the specified position in the source sequence.
         */
        EnumerablePrototype.elementAt = function (index) {
            return this.skip(index).first();
        };

        /**
         * Returns the element at a specified index in a sequence or a default value if the index is out of range.
         *
         * @param {Number} index The zero-based index of the element to retrieve.
         * @returns {Any} null if the index is outside the bounds of the source sequence; otherwise, the element at the specified position in the source sequence.
         */
        EnumerablePrototype.elementAtOrDefault = function (index) {
            return this.skip(index).firstOrDefault();
        };

        /**
         * Produces the set difference of two sequences by using the specified comparer function to compare values.
         *
         * @param {Enumerable} second An Enumerable whose elements that also occur in the first sequence will cause those elements to be removed from the returned sequence.
         * @param {Function} [comparer] A function to compare values.
         * @returns {Enumerable} A sequence that contains the set difference of the elements of two sequences.
         */
        EnumerablePrototype.except = function(second, comparer) {
            comparer || (comparer = defaultEqualityComparer);
            var parent = this;
            return new Enumerable(function () {
                var current, map = [], firstEnumerator = parent.getEnumerator(), secondEnumerator;
                try {
                    while (firstEnumerator.moveNext()) {
                        map.push(firstEnumerator.getCurrent());
                    }
                } catch(e) {
                    throw e;
                } finally {
                    firstEnumerator.dispose();
                }

                return enumeratorCreate(
                    function () {
                        secondEnumerator || (secondEnumerator = second.getEnumerator());
                        while (true) {
                            if (!secondEnumerator.moveNext()) {
                                return false;
                            }
                            current = secondEnumerator.getCurrent();
                            if (arrayIndexOf.call(map, current, comparer) === -1) {
                                map.push(current);
                                return true;
                            }
                        }
                    },
                    function () { return current; },
                    function () { secondEnumerator && secondEnumerator.dispose(); }
                );
            });
        };        

        /**
         * Returns the first element in a sequence that satisfies a specified condition if specified, else the first element.
         *
         * @param {Function} [predicate] A function to test each element for a condition.
         * @returns {Any} The first element in the sequence that passes the test in the specified predicate function if specified, else the first element.
         */
        EnumerablePrototype.first = function (predicate) {
            var enumerator = this.getEnumerator();
            try {
                while (enumerator.moveNext()) {
                    var current = enumerator.getCurrent();
                    if (!predicate || predicate(current))
                        return current;
                }
            } catch(e) {
                throw e;
            } finally {
                enumerator.dispose();
            }       
            throw new Error(seqNoElements);
        };

        /**
         * Returns the first element of the sequence that satisfies an optional condition or a default value if no such element is found.
         *
         * @param {Function} [predicate] A function to test each element for a condition.
         * @returns {Any} null if source is empty or if no element passes the test specified by predicate; otherwise, the first element in source that passes the test specified by predicate.
         */
        EnumerablePrototype.firstOrDefault = function (predicate) {
            var enumerator = this.getEnumerator();
            try {
                while (enumerator.moveNext()) {
                    var current = enumerator.getCurrent();
                    if (!predicate || predicate(current)) {
                        return current;
                    }
                }
            } catch(e) {
                throw e;
            } finally {
                enumerator.dispose();
            }       
            return null;
        };

        /**
         * Performs the specified action on each element of the Enumerable sequence
         *
         * @example
         * sequence.forEach(function (item, index, seq) { console.log(item); });
         *
         * @param {Function} action The function to perform on each element of the Enumerable sequence.
         *  action is invoked with three arguments:
         *      the element value
         *      the element index
         *      the Enumerable sequence being traversed
         */
        EnumerablePrototype.forEach = function (action, thisArg) {
            var e = this.getEnumerator(), i = 0;
            try {
                while (e.moveNext()) {
                    action.call(thisArg, e.getCurrent(), i++, this);
                }
            } catch(e) {
                throw e;
            } finally {
                e.dispose();
            }
        }; 

        EnumerablePrototype.groupBy = function (keySelector, elementSelector, resultSelector, keySerializer) {
            elementSelector || (elementSelector = identity);
            keySerializer || (keySerializer = defaultSerializer);
            var parent = this;
            return new Enumerable(function () {
                var map = {}, keys = [], index = 0, value, key,
                    parentEnumerator = parent.getEnumerator(), 
                    parentCurrent,
                    parentKey,
                    parentSerialized,
                    parentElement;
                try {
                    while (parentEnumerator.moveNext()) {
                        parentCurrent = parentEnumerator.getCurrent();
                        parentKey = keySelector(parentCurrent);
                        parentSerialized = keySerializer(parentKey);
                        if (!map[parentSerialized]) {
                            map[parentSerialized] = [];
                            keys.push(parentSerialized);
                        }
                        parentElement = elementSelector(parentCurrent);
                        map[parentSerialized].push(parentElement);
                    }                    
                } finally {
                    parentEnumerator.dispose();
                }

                return enumeratorCreate(
                    function () {
                        var values;
                        if (index < keys.length) {
                            key = keys[index++];
                            values = enumerableFromArray(map[key]);
                            if (!resultSelector) {
                                values.key = key;
                                value = values;
                            } else {
                                value = resultSelector(key, values);
                            }
                            return true;
                        }
                        return false;
                    },
                    function () { return value; }
                );
            });
        };

        EnumerablePrototype.intersect = function(second, comparer) {
            comparer || (comparer = defaultEqualityComparer);
            var parent = this;
            return new Enumerable(function () {
                var current,  map = [], firstEnumerator = parent.getEnumerator(), secondEnumerator;
                try {
                    while (firstEnumerator.moveNext()) {
                        map.push(firstEnumerator.getCurrent());
                    }                    
                } finally {
                    firstEnumerator.dispose();
                }
                return enumeratorCreate(
                    function () {
                        secondEnumerator || (secondEnumerator = second.getEnumerator());
                        while (true) {
                            if (!secondEnumerator.moveNext()) {
                                return false;
                            }
                            current = secondEnumerator.getCurrent();
                            if (arrayRemove.call(map, current, comparer)) {
                                return true;
                            }
                        }
                    },
                    function () {
                        return current;
                    },
                    function () {
                        secondEnumerator && secondEnumerator.dispose();
                    }
                );
            });
        };

        EnumerablePrototype.last = function (predicate) {
            var hasValue = false, value, enumerator = this.getEnumerator();
            try {
                while (enumerator.moveNext()) {
                    var current = enumerator.getCurrent();
                    if (!predicate || predicate(current)) {
                        hasValue = true;
                        value = current;
                    }
                }
            } finally {
                enumerator.dispose();
            }       
            if (hasValue) {
                return value;
            }
            throw new Error(seqNoElements);
        };

        EnumerablePrototype.lastOrDefault = function (predicate) {
            var hasValue = false, value, enumerator = this.getEnumerator();
            try {
                while (enumerator.moveNext()) {
                    var current = enumerator.getCurrent();
                    if (!predicate || predicate(current)) {
                        hasValue = true;
                        value = current;
                    }
                }
            } finally {
                enumerator.dispose();
            }

            return hasValue ? value : null;
        };

        EnumerablePrototype.max = function(selector) {
            if(selector) {
                return this.select(selector).max();
            }       
            var m, hasElement = false, enumerator = this.getEnumerator();
            try {
                while (enumerator.moveNext()) {
                    var x = enumerator.getCurrent();
                    if (!hasElement) {
                        m = x;
                        hasElement = true;
                    } else {
                        if (x > m) {
                            m = x;
                        }
                    }
                }
            } finally {
                enumerator.dispose();
            }
            if(!hasElement) {
                throw new Error(seqNoElements);
            }
            return m;
        };        

        EnumerablePrototype.min = function(selector) {
            if(selector) {
                return this.select(selector).min();
            }       
            var m, hasElement = false, enumerator = this.getEnumerator();
            try {
                while(enumerator.moveNext()) {
                    var x = enumerator.getCurrent();
                    if (!hasElement) {
                        m = x;
                        hasElement = true;
                    } else {
                        if (x < m) {
                            m = x;
                        }
                    }
                }
            } finally {
                enumerator.dispose();
            }
            if(!hasElement) {
                throw new Error(seqNoElements);
            }
            return m;
        };         

        EnumerablePrototype.orderBy = function (keySelector, comparer) {
            return new OrderedEnumerable(this, keySelector, comparer, false);
        };

        EnumerablePrototype.orderByDescending = function (keySelector, comparer) {
            return new OrderedEnumerable(this, keySelector, comparer, true);
        };

        EnumerablePrototype.reverse = function () {
            var arr = [], enumerator = this.getEnumerator();
            try {
                while (enumerator.moveNext()) {
                    arr.unshift(enumerator.getCurrent());
                }
            } finally {
                enumerator.dispose();
            }
            return enumerableFromArray(arr);
        };        

        EnumerablePrototype.select = function (selector) {
            var parent = this;
            return new Enumerable(function () {
                var current, index = 0, enumerator;
                return enumeratorCreate(
                    function () {
                        enumerator || (enumerator = parent.getEnumerator());
                        if (!enumerator.moveNext()) {
                            return false;
                        }
                        current = selector(enumerator.getCurrent(), index++);
                        return true;
                    },
                    function () { return current; },
                    function () { enumerator.dispose(); }
                );
            });
        };

        EnumerablePrototype.selectMany = function (collectionSelector, resultSelector) {
            var parent = this;
            return new Enumerable(function () {
                var current, index = 0, outerEnumerator, innerEnumerator;
                return enumeratorCreate(
                    function () {
                        outerEnumerator || (outerEnumerator = parent.getEnumerator());
                        while (true) {
                            if (!innerEnumerator) {
                                if (!outerEnumerator.moveNext()) {
                                    return false;
                                }

                                innerEnumerator = collectionSelector(outerEnumerator.getCurrent()).getEnumerator();
                            }
                            if (innerEnumerator.moveNext()) {
                                current = innerEnumerator.getCurrent();
                                
                                if (resultSelector) {
                                    var o = outerEnumerator.getCurrent();
                                    current = resultSelector(o, current);
                                }

                                return true;
                            } else {
                                innerEnumerator.dispose();
                                innerEnumerator = null;
                            }
                        }
                    },
                    function () { return current; },
                    function () {
                        innerEnumerator && innerEnumerator.dispose();
                        outerEnumerator && outerEnumerator.dispose();   
                    }
                );
            });
        };

        Enumerable.sequenceEqual = function (first, second, comparer) {
            return first.sequenceEqual(second, comparer);
        };

        EnumerablePrototype.sequenceEqual = function (second, comparer) {
            comparer || (comparer = defaultEqualityComparer);
            var e1 = this.getEnumerator(), e2 = second.getEnumerator();
            try {
                while (e1.moveNext()) {
                    if (!e2.moveNext() || ! comparer(e1.getCurrent(), e2.getCurrent())) {
                        return false;
                    }
                }
                if (e2.moveNext()) {
                    return false;
                }
                return true;
            }
            finally {
                e1.dispose();
                e2.dispose();
            }
        };

        EnumerablePrototype.single = function (predicate) {
            if (predicate) {
                return this.where(predicate).single();
            }
            var enumerator = this.getEnumerator();
            try {
                while (enumerator.moveNext()) {
                    var current = enumerator.getCurrent();
                    if (enumerator.moveNext()) {
                        throw new Error(invalidOperation);
                    }
                    return current;
                }
            } finally {
                enumerator.dispose();
            }
            throw new Error(seqNoElements);
        };

        EnumerablePrototype.singleOrDefault = function (predicate) {
            if (predicate) {
                return this.where(predicate).single();
            }
            var enumerator = this.getEnumerator();
            try {
                while (enumerator.moveNext()) {
                    var current = enumerator.getCurrent();
                    if (enumerator.moveNext()) {
                        throw new Error(invalidOperation);
                    }
                    return current;
                }
            } finally {
                enumerator.dispose();
            }
            return null;
        };        

        EnumerablePrototype.skip = function (count) {
            var parent = this;
            return new Enumerable(function () {
                var current, skipped = false, enumerator;
                return enumeratorCreate(
                    function () {
                        enumerator || (enumerator = parent.getEnumerator());
                        if (!skipped) {
                            for (var i = 0; i < count; i++) {
                                if (!enumerator.moveNext()) {
                                    return false;
                                }
                            }
                            skipped = true;
                        }
                        if (!enumerator.moveNext()) {
                            return false;
                        }
                        current = enumerator.getCurrent();
                        return true;
                    },
                    function () { return current; },
                    function () { enumerator.dispose(); }
                );
            });
        };

        EnumerablePrototype.skipWhile = function (selector) {
            var parent = this;
            return new Enumerable(function () {
                var current, skipped = false, enumerator;
                return enumeratorCreate(
                    function () {
                        enumerator || (enumerator = parent.getEnumerator());
                        if (!skipped) {
                            while (true) {
                                if (!enumerator.moveNext()) {
                                    return false;
                                }
                                if (!selector(enumerator.getCurrent())) {
                                    current = enumerator.getCurrent();
                                    return true;
                                }
                            }
                            skipped = true;
                        }
                        if (!enumerator.moveNext()) {
                            return false;
                        }
                        current = enumerator.getCurrent();
                        return true;
                    },
                    function () { return current;  },
                    function () { enumerator.dispose(); }
                );
            });
        };

        EnumerablePrototype.sum = function(selector) {
            if(selector) {
                return this.select(selector).sum();
            }
            var s = 0, enumerator = this.getEnumerator();
            try {
                while (enumerator.moveNext()) {
                    s += enumerator.getCurrent();
                }
            } finally {
                enumerator.dispose();
            }
            return s;
        };        

        EnumerablePrototype.take = function (count) {
            var parent = this;
            return new Enumerable(function () {
                var current, enumerator, myCount = count;
                return enumeratorCreate(
                    function () {
                        enumerator || (enumerator = parent.getEnumerator());
                        if (myCount === 0) {
                            return false;
                        }
                        if (!enumerator.moveNext()) {
                            myCount = 0;
                            return false;
                        }
                        myCount--;
                        current = enumerator.getCurrent();
                        return true;
                    },
                    function () { return current; },
                    function () { enumerator.dispose(); }
                );
            });
        };

        EnumerablePrototype.takeWhile = function (selector) {
            var parent = this;
            return new Enumerable(function () {
                var current, index = 0, enumerator;
                return enumeratorCreate(
                    function () {
                        enumerator || (enumerator = parent.getEnumerator());
                        if (!enumerator.moveNext()){
                            return false;
                        }
                        current = enumerator.getCurrent();
                        if (!selector(current, index++)){
                            return false;
                        }
                        return true;
                    },
                    function () { return current; },
                    function () { enumerator.dispose(); }
                );
            });
        };        

        EnumerablePrototype.toArray = function () {
            var results = [],
                e = this.getEnumerator();
            try {
                while (e.moveNext()) {
                    results.push(e.getCurrent());
                }
                return results;
            } finally {
                e.dispose();
            }
        };

        EnumerablePrototype.where = function (selector) {
            var parent = this;
            return new Enumerable(function () {
                var current, index = 0, enumerator;
                return enumeratorCreate(
                    function () {
                        enumerator || (enumerator = parent.getEnumerator());
                        while (true) {
                            if (!enumerator.moveNext()) {
                                return false;
                            }
                            current = enumerator.getCurrent();
                            if (selector(current, index++)) {
                                return true;
                            }
                        }
                    },
                    function () { return current; },
                    function () { enumerator.dispose(); }
                );
            });
        };

        EnumerablePrototype.union = function(second, comparer) {
            comparer || (comparer = defaultEqualityComparer);
            var parent = this;
            return enumerableCreate(function () {
                var current, enumerator, map = [], firstDone = false, secondDone = false;
                return enumeratorCreate(
                    function () {
                        while (true) {
                            if (!enumerator) {
                                if (secondDone) {
                                    return false;
                                }
                                if (!firstDone) {
                                    enumerator = parent.getEnumerator();
                                    firstDone = true;
                                } else {
                                    enumerator = second.getEnumerator();
                                    secondDone = true;
                                }
                            }
                            if (enumerator.moveNext()) {
                                current = enumerator.getCurrent();
                                if (arrayIndexOf.call(map, current, comparer) === -1) {
                                    map.push(current);
                                    return true;
                                }
                            } else {
                                enumerator.dispose();
                                enumerator = null;
                            }
                        }
                    },
                    function () { return current; },
                    function () {
                        enumerator && enumerator.dispose();
                    }
                );
            });
        };          

        EnumerablePrototype.zip = function (right, selector) {
            var parent = this;
            return new Enumerable(function () {
                var e1, e2, current;
                return enumeratorCreate(
                    function () {
                        if (!e1 && !e2) {
                            e1 = parent.getEnumerator();
                            e2 = right.getEnumerator();
                        }

                        if (e1.moveNext() && e2.moveNext()) {
                            current = selector(e1.getCurrent(), e2.getCurrent());
                            return true;
                        }
                        return false;
                    },
                    function () {
                        return current;
                    },
                    function () {
                        e1.dispose();
                        e2.dispose();
                    }
                );
            });
        };

        return Enumerable;
    }());

    var enumerableConcat = Enumerable.concat = function () {
        return enumerableFromArray(arguments).selectMany(identity);
    };

    var enumerableCreate = Enumerable.create = function (getEnumerator) {
        return new Enumerable(getEnumerator);
    };

    var enumerableEmpty = Enumerable.empty = function () {
        return new Enumerable(function () {
            return enumeratorCreate(
                function () { return false; },
                function () { throw new Error(seqNoElements); }
            );
        });
    };

    var enumerableFromArray = Enumerable.fromArray = function (array) {
        return new Enumerable(function () {
            var index = 0, value;
            return enumeratorCreate(
                function () {
                    if (index < array.length) {
                        value = array[index++];
                        return true;
                    }
                    return false;
                },
                function () {
                    return value;
                }
            );
        });
    };

    /**
     * Returns a sequence with a single element.
     * 
     * @param value Single element of the resulting sequence.
     * @return Sequence with a single element.
     */
    Enumerable.returnValue = function (value) {
        return new Enumerable(function () {
            var done = false;
            return enumeratorCreate(
                function () {
                    if (done) {
                        return false;
                    }
                    return done = true;
                },
                function () {
                    return value;
                }
            );
        });
    };

    var enumerableRange = Enumerable.range = function (start, count) {
        return new Enumerable(function () {
            var current = start - 1, end = start + count - 1;
            return enumeratorCreate(
                function () {
                    if (current < end) {
                        current++;
                        return true;
                    } else {
                        return false;
                    }
                },
                function () { return current; }
            );
        });
    };  

    var enumerableRepeat = Enumerable.repeat = function (value, repeatCount) {
        return new Enumerable(function () {
            var count = repeatCount == null ? -1 : repeatCount, hasRepeatCount = repeatCount != null;
            return enumeratorCreate(
                function () {
                    if (count !== 0) {
                        hasRepeatCount && count--;
                        return true;
                    } else {
                        return false;
                    }
                },
                function () { return value; }
            );
        });
    };          

    function EnumerableSorter (keySelector, comparer, descending, next) {
        this.keySelector = keySelector;
        this.comparer = comparer;
        this.descending = descending;
        this.next = next;
    }

    EnumerableSorter.prototype = {
        computeKeys: function (elements, count) {
            this.keys = new Array(count);
            for (var i = 0; i < count; i++) { this.keys[i] = this.keySelector(elements[i]); }
            if (this.next) { this.next.computeKeys(elements, count); }
        },
        compareKeys: function (index1, index2) {
            var c = this.comparer(this.keys[index1], this.keys[index2]);
            if (c === 0) {
                return this.next == null ? index1 - index2 : this.next.compareKeys(index1, index2);
            }
            return this.descending ? -c : c;
        },
        sort: function (elements, count) {
            this.computeKeys(elements, count);
            var map = new Array(count);
            for (var i = 0; i < count; i++) { map[i] = i; }
            this.quickSort(map, 0, count - 1);
            return map;
        },
        quickSort: function (map, left, right) {
            do {
                var i = left;
                var j = right;
                var x = map[i + ((j - i) >> 1)];
                do {
                    while (i < map.length && this.compareKeys(x, map[i]) > 0) i++;
                    while (j >= 0 && this.compareKeys(x, map[j]) < 0) j--;
                    if (i > j) break;
                    if (i < j) {
                        var temp = map[i];
                        map[i] = map[j];
                        map[j] = temp;
                    }
                    i++;
                    j--;
                } while (i <= j);
                if (j - left <= right - i) {
                    if (left < j) this.quickSort(map, left, j);
                    left = i;
                }
                else {
                    if (i < right) this.quickSort(map, i, right);
                    right = j;
                }
            } while (left < right);
        }     
    };

    var OrderedEnumerable = (function () {
        inherits(OrderedEnumerable, Enumerable);
        function OrderedEnumerable (source, keySelector, comparer, descending) {
            this.source = source;
            this.keySelector = keySelector || identity;
            this.comparer = comparer || defaultComparer;
            this.descending = descending;
        }

        var OrderedEnumerablePrototype = OrderedEnumerable.prototype;
        OrderedEnumerablePrototype.getEnumerableSorter = function (next) {
            var sorter = new EnumerableSorter(this.keySelector, this.comparer, this.descending, next);
            if (this.parent != null) {
                sorter = this.parent.getEnumerableSorter(sorter);
            }
            return sorter;
        };

        OrderedEnumerablePrototype.createOrderedEnumerable = function (keySelector, comparer, descending) {
            var e = new OrderedEnumerable(this.source, keySelector, comparer, descending);
            e.parent = this;
            return e;
        };

        OrderedEnumerablePrototype.getEnumerator = function () {
            var buffer = this.source.toArray(),
                length = buffer.length,
                sorter = this.getEnumerableSorter(),
                map = sorter.sort(buffer, length),
                index = 0,
                current;

            return enumeratorCreate(function () {
                if (index < length) {
                    current = buffer[map[index++]];
                    return true;
                }
                return false;
            }, function () {
                return current;
            });
        };

        OrderedEnumerablePrototype.thenBy = function (keySelector, comparer) {
            return this.createOrderedEnumerable(keySelector, null, false);
        };

        OrderedEnumerablePrototype.thenByDescending = function (keySelector, comparer) {
            return this.createOrderedEnumerable(keySelector, comparer, false);
        };

        return OrderedEnumerable;
    }());
    