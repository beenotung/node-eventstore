var expect = require('expect.js'),
  eventstoreModule = require('../lib/eventStore'),
  storageModule = require('../lib/storage/inMemory/storage');

describe('EventStore', function () {

  var eventstore;

  describe('not beeing configured', function () {

    before(function () {
      eventstore = eventstoreModule.createStore();
    });

    describe('requesting an eventstream', function () {

      it('it should callback with an error', function (done) {

        eventstore.getEventStream('1', 0, -1, function (err) {
          expect(err).to.be.ok();
          done();
        });

      });

    });

    describe('committing', function () {

      it('it should callback with an error', function (done) {

        var fakeEventStream = {
          currentRevision: function () {
            return 0;
          },
          events: [],
          uncommittedEvents: []
        };

        eventstore.commit(fakeEventStream, function (err) {
          expect(err).to.be.ok();
          done();
        });

      });

    });

  });

  describe('beeing configured', function () {

    before(function (done) {
      eventstore = eventstoreModule.createStore({
        forkDispatching: false
      });
      storageModule.createStorage(function (err, storage) {
        eventstore.configure(function () {
          this.use(storage);
        });
        eventstore.start(done);
      });
    });

    describe('requesting all events', function () {

      before(function (done) {
        eventstore.getEventStream('e-1a', 0, -1, function (err, stream) {
          stream.addEvent({ id: '11a'});
          stream.addEvent({ id: '22a'});
          stream.addEvent({ id: '33a'});
          stream.addEvent({ id: '44a'});
          stream.addEvent({ id: '55a'});
          stream.commit(function () {
            eventstore.getEventStream('e-1b', 0, -1, function (err, stream) {
              stream.addEvent({ id: '11b'});
              stream.addEvent({ id: '22b'});
              stream.addEvent({ id: '33b'});
              stream.addEvent({ id: '44b'});
              stream.addEvent({ id: '55b'});
              stream.commit(done);
            });
          });
        });
      });

      var events;

      it('it should callback with the correct values', function (done) {

        eventstore.getAllEvents(4, 2, function (err, evts) {
          events = evts;
          expect(err).not.to.be.ok();
          expect(events[0].payload.id).to.eql('55a');
          expect(events[1].payload.id).to.eql('11b');
          expect(events).to.have.length(2);
          done();
        });

      });

      describe('requesting the next range', function () {

        it('it should callback with the correct values', function (done) {

          events.next(function (err, evts) {
            expect(err).not.to.be.ok();
            expect(evts[0].payload.id).to.eql('22b');
            expect(evts).to.have.length(2);
            done();
          });

        });

      });

      describe('calling getUndispatchedEvents', function () {

        var firstEvt;

        it('it should be in the array', function (done) {
          eventstore.getUndispatchedEvents(function (err, evts) {
            expect(err).not.to.be.ok();
            expect(evts).to.be.an('array');
            expect(evts).to.have.length(10);

            firstEvt = evts[0];

            done();
          });
        });

        describe('calling setEventToDispatched', function () {

          it('it should not be in the undispatched array anymore', function (done) {

            eventstore.setEventToDispatched(firstEvt, function (err) {
              expect(err).not.to.be.ok();
              eventstore.getUndispatchedEvents(function (err, evts) {
                expect(err).not.to.be.ok();
                expect(evts).to.be.an('array');
                expect(evts).to.have.length(9);

                done();
              });
            });

          });

        });

      });

    });

    describe('requesting a new eventstream', function () {

      it('it should callback return one correctly', function () {

        var str = eventstore.getNewEventStream('reallyNew');
        expect(str.currentRevision).to.be.a(Function);
        expect(str.addEvent).to.be.a(Function);
        expect(str.commit).to.be.a(Function);
        expect(str).to.have.property('store', eventstore);
        expect(str).to.have.property('streamId', 'reallyNew');
        expect(str).to.have.property('events');
        expect(str.events).to.be.empty();
        expect(str).to.have.property('uncommittedEvents');
        expect(str.uncommittedEvents).to.be.empty();
        expect(str).to.have.property('lastRevision', -1);

      });

    });

    describe('requesting an eventstream', function () {

      it('it should callback without an error', function (done) {

        eventstore.getEventStream('1', 0, -1, function (err, es) {
          expect(err).not.to.be.ok();
          done();
        });

      });

    });

    describe('requesting all events of a stream', function () {

      before(function (done) {
        eventstore.getEventStream('e4', 0, -1, function (err, stream) {
          stream.addEvent({ id: '1'});
          stream.addEvent({ id: '2'});
          stream.addEvent({ id: '3'});
          stream.addEvent({ id: '4'});
          stream.addEvent({ id: '5'});
          stream.commit(done);
        });
      });

      it('it should callback with the correct values', function (done) {

        eventstore.getEvents('e4', function (err, events) {
          expect(err).not.to.be.ok();
          expect(events[0].payload.id).to.eql('1');
          expect(events).to.have.length(5);
          done();
        });

      });

    });

    describe('requesting all events of a stream with additional metas', function () {

      describe('when calling only with streamId', function () {

        before(function (done) {
          eventstore.getEventStream({
            aggregateId: 'e4+'
          }, 0, -1, function (err, stream) {
            stream.addEvent({ id: '1'});
            stream.addEvent({ id: '2'});
            stream.addEvent({ id: '3'});
            stream.addEvent({ id: '4'});
            stream.addEvent({ id: '5'});
            stream.commit(done);
          });
        });

        it('it should callback with the correct values', function (done) {

          eventstore.getEvents('e4+', function (err, events) {
            expect(err).not.to.be.ok();
            expect(events).to.have.length(5);
            expect(events[0].payload.id).to.eql('1');
            done();
          });

        });

      });

      describe('when calling with all metas', function () {

        before(function (done) {
          eventstore.getEventStream({
            aggregateId: 'e4+',
            aggregate: 'myAggr',
            context: 'myContext'
          }, 0, -1, function (err, stream) {
            stream.addEvent({ id: '1'});
            stream.addEvent({ id: '2'});
            stream.addEvent({ id: '3'});
            stream.addEvent({ id: '4'});
            stream.addEvent({ id: '5'});
            stream.commit(done);
          });
        });

        it('it should callback with the correct values', function (done) {

          eventstore.getEvents({
            aggregateId: 'e4+',
            aggregate: 'myAggr',
            context: 'myContext'
          }, function (err, events) {
            expect(err).not.to.be.ok();
            expect(events).to.have.length(5);
            expect(events[0].payload.id).to.eql('1');
            done();
          });

        });

      });

      describe('when calling with aggregateId', function () {

        before(function (done) {
          eventstore.getEventStream({
            aggregateId: 'e4+++'
          }, 0, -1, function (err, stream) {
            stream.addEvent({ id: '1'});
            stream.addEvent({ id: '2'});
            stream.addEvent({ id: '3'});
            stream.addEvent({ id: '4'});
            stream.addEvent({ id: '5'});
            stream.commit(done);
          });
        });

        it('it should callback with the correct values', function (done) {

          eventstore.getEvents({
            aggregateId: 'e4+++'
          }, function (err, events) {
            expect(err).not.to.be.ok();
            expect(events).to.have.length(5);
            expect(events[0].payload.id).to.eql('1');
            done();
          });

        });

      });

      describe('when calling with aggregate', function () {

        before(function (done) {
          eventstore.getEventStream({
            aggregateId: 'e4++++',
            aggregate: 'myAggr'
          }, 0, -1, function (err, stream) {
            stream.addEvent({ id: '1'});
            stream.addEvent({ id: '2'});
            stream.addEvent({ id: '3'});
            stream.addEvent({ id: '4'});
            stream.addEvent({ id: '5'});
            stream.commit(done);
          });
        });

        it('it should callback with the correct values', function (done) {

          eventstore.getEvents({
            aggregateId: 'e4++++',
            aggregate: 'myAggr'
          }, function (err, events) {
            expect(err).not.to.be.ok();
            expect(events).to.have.length(5);
            expect(events[0].payload.id).to.eql('1');
            done();
          });

        });

      });

      describe('when calling with context', function () {

        before(function (done) {
          eventstore.getEventStream({
            aggregateId: 'e4+++++',
            context: 'myContext'
          }, 0, -1, function (err, stream) {
            stream.addEvent({ id: '1'});
            stream.addEvent({ id: '2'});
            stream.addEvent({ id: '3'});
            stream.addEvent({ id: '4'});
            stream.addEvent({ id: '5'});
            stream.commit(done);
          });
        });

        it('it should callback with the correct values', function (done) {

          eventstore.getEvents({
            aggregateId: 'e4+++++',
            context: 'myContext'
          }, function (err, events) {
            expect(err).not.to.be.ok();
            expect(events).to.have.length(5);
            expect(events[0].payload.id).to.eql('1');
            done();
          });

        });

      });

      describe('when calling with context but searched only with aggregateId', function () {

        before(function (done) {
          eventstore.getEventStream({
            aggregateId: 'e4Special',
            context: 'myContext'
          }, 0, -1, function (err, stream) {
            stream.addEvent({ id: '1'});
            stream.addEvent({ id: '2'});
            stream.addEvent({ id: '3'});
            stream.addEvent({ id: '4'});
            stream.addEvent({ id: '5'});
            stream.commit(done);
          });
        });

        it('it should callback with the correct values', function (done) {

          eventstore.getEvents({
            aggregateId: 'e4Special'
          }, function (err, events) {
            expect(err).not.to.be.ok();
            expect(events).to.have.length(5);
            expect(events[0].payload.id).to.eql('1');
            done();
          });

        });

      });

      describe('when calling with aggregate but searched only with aggregateId', function () {

        before(function (done) {
          eventstore.getEventStream({
            aggregateId: 'e4Special2',
            aggregate: 'myAggregate'
          }, 0, -1, function (err, stream) {
            stream.addEvent({ id: '1'});
            stream.addEvent({ id: '2'});
            stream.addEvent({ id: '3'});
            stream.addEvent({ id: '4'});
            stream.addEvent({ id: '5'});
            stream.commit(done);
          });
        });

        it('it should callback with the correct values', function (done) {

          eventstore.getEvents({
            aggregateId: 'e4Special2'
          }, function (err, events) {
            expect(err).not.to.be.ok();
            expect(events).to.have.length(5);
            expect(events[0].payload.id).to.eql('1');
            done();
          });

        });

      });

    });

    describe('committing', function () {

      it('it should callback without an error', function (done) {

        var fakeEventStream = {
          currentRevision: function () {
            return 0;
          },
          events: [],
          uncommittedEvents: [
            {aggregateId: 'e1', payload: { event: 'bla' } },
            {aggregateId: 'e1', payload: { event: 'blabli' } }
          ]
        };

        eventstore.commit(fakeEventStream, function (err) {
          expect(err).not.to.be.ok();
          done();
        });

      });

      describe('requesting the full eventstream', function () {

        it('it should callback with the correct values', function (done) {

          eventstore.getEventStream('e1', 0, -1, function (err, es) {
            expect(es.events).to.have.length(2);
            expect(es.events[0].commitSequence).to.eql(0);
            expect(es.events[0].restInCommitStream).to.eql(1);
            expect(es.events[1].commitSequence).to.eql(1);
            expect(es.events[1].restInCommitStream).to.eql(0);
            expect(es.uncommittedEvents).to.have.length(0);
            done();
          });

        });

      });

    });

    describe('adding an event to an eventstream', function () {

      before(function (done) {
        eventstore.getEventStream('e2', 0, -1, function (err, es) {
          es.addEvent({streamId: 'e2', payload: 'test'});
          es.commit(done);
        });
      });

      describe('requesting the full eventstream', function () {

        var stream;

        it('it should callback with the correct values', function (done) {

          eventstore.getEventStream('e2', 0, -1, function (err, es) {
            stream = es;
            expect(es.currentRevision()).to.be(0);
            expect(es.currentRevision()).to.be(es.lastRevision);
            expect(es.events).to.have.length(1);
            expect(es.uncommittedEvents).to.have.length(0);
            expect(es.events[0].streamId).to.eql('e2');
            expect(es.events[0].payload.payload).to.eql('test');
            done();
          });

        });

        describe('creating a snapshot', function () {

          it('it should callback without an error', function (done) {

            eventstore.createSnapshot(stream.streamId, stream.currentRevision(), 'data', 2, function (err) {
              expect(err).not.to.be.ok();
              done();
            });

          });

          describe('calling getFromSnapshot', function () {

            it('it should callback with the correct values', function (done) {

              eventstore.getFromSnapshot('e2', function (err, snapshot, es) {
                expect(err).not.to.be.ok();
                expect(snapshot.data).to.eql('data');
                expect(snapshot.streamId).to.eql('e2');
                expect(es.currentRevision()).to.be(0);
                expect(snapshot.revision).to.be(es.lastRevision);
                expect(snapshot.revision).to.be(es.currentRevision());
                expect(snapshot.version).to.be(2);
                done();
              });

            });

          });

        });

        describe('creating a snapshot with additional metas', function () {

          it('it should callback without an error', function (done) {

            eventstore.createSnapshot({
              aggregateId: 'e2Special',
              aggregate: 'myAggregate',
              context: 'myContext'
            }, stream.currentRevision(), 'data', 2, function (err) {
              expect(err).not.to.be.ok();
              done();
            });

          });

          describe('calling getFromSnapshot', function () {

            it('it should callback with the correct values', function (done) {

              eventstore.getFromSnapshot('e2Special', function (err, snapshot, es) {
                expect(err).not.to.be.ok();
                expect(snapshot.data).to.eql('data');
                expect(snapshot.streamId).to.eql('e2Special');
                expect(snapshot.aggregateId).to.eql('e2Special');
                expect(snapshot.aggregate).to.eql('myAggregate');
                expect(snapshot.context).to.eql('myContext');
                expect(es.currentRevision()).to.be(0);
                expect(snapshot.revision).to.be(es.lastRevision);
                expect(snapshot.revision).to.be(es.currentRevision());
                expect(snapshot.version).to.be(2);
                done();
              });

            });

          });

          describe('calling getFromSnapshot with all metas', function () {

            it('it should callback with the correct values', function (done) {

              eventstore.getFromSnapshot({
                aggregateId: 'e2Special',
                aggregate: 'myAggregate',
                context: 'myContext'
              }, function (err, snapshot, es) {
                expect(err).not.to.be.ok();
                expect(snapshot.data).to.eql('data');
                expect(snapshot.streamId).to.eql('e2Special');
                expect(snapshot.aggregateId).to.eql('e2Special');
                expect(snapshot.aggregate).to.eql('myAggregate');
                expect(snapshot.context).to.eql('myContext');
                expect(es.currentRevision()).to.be(0);
                expect(snapshot.revision).to.be(es.lastRevision);
                expect(snapshot.revision).to.be(es.currentRevision());
                expect(snapshot.version).to.be(2);
                done();
              });

            });

          });

          describe('calling getFromSnapshot only with aggregate', function () {

            it('it should callback with the correct values', function (done) {

              eventstore.getFromSnapshot({
                aggregateId: 'e2Special',
                aggregate: 'myAggregate'
              }, function (err, snapshot, es) {
                expect(err).not.to.be.ok();
                expect(snapshot.data).to.eql('data');
                expect(snapshot.streamId).to.eql('e2Special');
                expect(snapshot.aggregateId).to.eql('e2Special');
                expect(snapshot.aggregate).to.eql('myAggregate');
                expect(snapshot.context).to.eql('myContext');
                expect(es.currentRevision()).to.be(0);
                expect(snapshot.revision).to.be(es.lastRevision);
                expect(snapshot.revision).to.be(es.currentRevision());
                expect(snapshot.version).to.be(2);
                done();
              });

            });

          });

          describe('calling getFromSnapshot only with context', function () {

            it('it should callback with the correct values', function (done) {

              eventstore.getFromSnapshot({
                aggregateId: 'e2Special',
                context: 'myContext'
              }, function (err, snapshot, es) {
                expect(err).not.to.be.ok();
                expect(snapshot.data).to.eql('data');
                expect(snapshot.streamId).to.eql('e2Special');
                expect(snapshot.aggregateId).to.eql('e2Special');
                expect(snapshot.aggregate).to.eql('myAggregate');
                expect(snapshot.context).to.eql('myContext');
                expect(es.currentRevision()).to.be(0);
                expect(snapshot.revision).to.be(es.lastRevision);
                expect(snapshot.revision).to.be(es.currentRevision());
                expect(snapshot.version).to.be(2);
                done();
              });

            });

          });

        });

      });

    });

  });

});