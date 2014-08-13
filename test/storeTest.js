var expect = require('expect.js'),
  Base = require('../lib/base'),
  async = require('async');

var types = ['inmemory'/*, 'mongodb', 'tingodb', 'redis', 'couchdb'*/];

types.forEach(function (type) {

  describe('"' + type + '" store implementation', function () {

    var Store = require('../lib/database/' + type);
    var store;

    describe('creating an instance', function () {
      
      it('it should return correct object', function () {

        store = new Store();
        expect(store).to.be.a(Base);
        expect(store.connect).to.be.a('function');
        expect(store.disconnect).to.be.a('function');
        expect(store.getNewId).to.be.a('function');
        expect(store.getEvents).to.be.a('function');
        expect(store.getEventsByRevision).to.be.a('function');
        expect(store.getSnapshot).to.be.a('function');
        expect(store.addSnapshot).to.be.a('function');
        expect(store.addEvents).to.be.a('function');
        expect(store.getUndispatchedEvents).to.be.a('function');
        expect(store.setEventToDispatched).to.be.a('function');
        expect(store.clear).to.be.a('function');
      });
      
      describe('calling connect', function () {
        
        afterEach(function (done) {
          store.disconnect(done);
        });
        
        it('it should callback successfully', function (done) {

          store.connect(function (err) {
            expect(err).not.to.be.ok();
            done();
          });

        });

        it('it should emit connect', function (done) {

          store.once('connect', done);
          store.connect();

        });
        
      });

      describe('having connected', function () {

        describe('calling disconnect', function () {

          beforeEach(function (done) {
            store.connect(done);
          });

          it('it should callback successfully', function (done) {

            store.disconnect(function (err) {
              expect(err).not.to.be.ok();
              done();
            });

          });

          it('it should emit disconnect', function (done) {

            store.once('disconnect', done);
            store.disconnect();

          });

        });

        describe('using the store', function () {

          before(function (done) {
            store.connect(done);
          });
          
          beforeEach(function (done) {
            store.clear(done);
          });
  
          describe('calling getNewId', function () {
  
            it('it should callback with a new Id as string', function (done) {
  
              store.getNewId(function (err, id) {
                expect(err).not.to.be.ok();
                expect(id).to.be.a('string');
                done();
              });
  
            });
  
          });
  
          describe('calling addEvents', function () {
            
            describe('with one event in the array', function () {

              it('it should save the event', function(done) {

                var event = {
                  aggregateId: 'id1',
                  streamRevision: 0,
                  commitId: '10',
                  dispatched: false,
                  payload: {
                    event:'bla'
                  }
                };

                store.addEvents([event], function(err) {
                  expect(err).not.to.be.ok();

                  store.getEvents({ aggregateId: 'id1' }, 0, -1, function(err, evts) {
                    expect(err).not.to.be.ok();
                    expect(evts).to.be.an('array');
                    expect(evts).to.have.length(1);

                    done();
                  });
                });

              });
              
            });

            describe('with multiple events in the array', function () {

              it('it should save the event', function(done) {

                var event1 = {
                  aggregateId: 'id2',
                  streamRevision: 0,
                  commitId: '10',
                  dispatched: false,
                  payload: {
                    event:'bla'
                  }
                };

                var event2 = {
                  aggregateId: 'id2',
                  streamRevision: 0,
                  commitId: '20',
                  dispatched: false,
                  payload: {
                    event:'bla2'
                  }
                };

                store.addEvents([event1, event2], function(err) {
                  expect(err).not.to.be.ok();

                  store.getEvents({ aggregateId: 'id2' }, 0, -1, function(err, evts) {
                    expect(err).not.to.be.ok();
                    expect(evts).to.be.an('array');
                    expect(evts).to.have.length(2);

                    done();
                  });
                });

              });

            });
            
            describe('without aggregateId', function () {
              
              it('it should callback with an error', function (done) {

                var event = {
                  //aggregateId: 'id1',
                  streamRevision: 0,
                  commitId: '10',
                  dispatched: false,
                  payload: {
                    event:'bla'
                  }
                };

                store.addEvents([event], function(err) {
                  expect(err).to.be.ok();
                  done();
                });
                
              });
              
            })

          })
          
        });
        
      });
      
    });
    
  });

});
  