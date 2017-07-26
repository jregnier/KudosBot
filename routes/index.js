var http = require('request');
var cors = require('cors');
var uuid = require('uuid');
var url = require('url');
var kh = require('./kudosHelper');


// This is the heart of your HipChat Connect add-on. For more information,
// take a look at https://developer.atlassian.com/hipchat/tutorials/getting-started-with-atlassian-connect-express-node-js
module.exports = function (app, addon) {
  var hipchat = require('../lib/hipchat')(addon);

  // simple healthcheck
  app.get('/healthcheck', function (req, res) {
    res.send('OK');
  });

  // Root route. This route will serve the `addon.json` unless a homepage URL is
  // specified in `addon.json`.
  app.get('/',
    function (req, res) {
      // Use content-type negotiation to choose the best way to respond
      res.format({
        // If the request content-type is text-html, it will decide which to serve up
        'text/html': function () {
          var homepage = url.parse(addon.descriptor.links.homepage);
          if (homepage.hostname === req.hostname && homepage.path === req.path) {
            res.render('homepage', addon.descriptor);
          } else {
            res.redirect(addon.descriptor.links.homepage);
          }
        },
        // This logic is here to make sure that the `addon.json` is always
        // served up when requested by the host
        'application/json': function () {
          res.redirect('/atlassian-connect.json');
        }
      });
    }
  );

  // This is an example route that's used by the default for the configuration page
  // https://developer.atlassian.com/hipchat/guide/configuration-page
  app.get('/config',
    // Authenticates the request using the JWT token in the request
    addon.authenticate(),
    function (req, res) {
      // The `addon.authenticate()` middleware populates the following:
      // * req.clientInfo: useful information about the add-on client such as the
      //   clientKey, oauth info, and HipChat account info
      // * req.context: contains the context data accompanying the request like
      //   the roomId
      res.render('config', req.context);
    }
  );

  // This is an example route to handle an incoming webhook
  // https://developer.atlassian.com/hipchat/guide/webhooks
  app.post('/webhook',
    addon.authenticate(),
    function (req, res) {
      if (req.body.item.message.mentions.length == 1) {
        var userArray = 'UserArrayKey';
        var requestUser = req.body.item.message.from.name;
        var mention = req.body.item.message.mentions[0];

        if (requestUser == mention.name) {
          hipchat.sendMessage(req.clientInfo, req.identity.roomId, 'Attempting to Kudos youself....for shame')
            .then(function (data) {
              res.sendStatus(200);
            });
        }
        else {
          addon.settings.get(userArray, req.clientInfo.clientKey)
            .then(function (data) {
              var user;
              if (data) {
                user = kh.findUser(data, mention.name);
                if (user) {
                  user.kudosCount += 1;
                  user.totalKudosCount += 1;
                }
                else {
                  user = kh.newUser(mention.name);
                  data.push(user);
                }
              } else {
                user = kh.newUser(mention.name);
                data = [user];
              }

              addon.settings.set(userArray, data, req.clientInfo.clientKey);

              hipchat.sendMessage(req.clientInfo, req.identity.roomId, mention.name + '   current: ' + user.kudosCount + ' total: ' + user.totalKudosCount)
                .then(function (data) {
                  res.sendStatus(200);
                });
            });
        }
      } else {
        hipchat.sendMessage(req.clientInfo, req.identity.roomId, 'User Required, Invalid Entry!')
          .then(function (data) {
            res.sendStatus(200);
          });
      }
    }
  );

  app.get('/dialog',
    addon.authenticate(), //handle the JWT token
    function (req, res) {
      var userArray = 'UserArrayKey';
      addon.settings.get(userArray, req.clientInfo.clientKey)
        .then(function (data) {
          
          var winner = kh.winner(data);

          res.render('dialog', { //render the views/sidebar.hbs template, passing context parameters
            identity: req.identity,
            winnerName: winner.name,
            winnerIndex: winner.index
          });
        });
    }
  );

  // Notify the room that the add-on was installed. To learn more about
  // Connect's install flow, check out:
  // https://developer.atlassian.com/hipchat/guide/installation-flow
  addon.on('installed', function (clientKey, clientInfo, req) {
    hipchat.sendMessage(clientInfo, req.body.roomId, 'The ' + addon.descriptor.name + ' add-on has been installed in this room');
  });

  // Clean up clients when uninstalled
  addon.on('uninstalled', function (id) {
    addon.settings.client.keys(id + ':*', function (err, rep) {
      rep.forEach(function (k) {
        addon.logger.info('Removing key:', k);
        addon.settings.client.del(k);
      });
    });
  });

};
