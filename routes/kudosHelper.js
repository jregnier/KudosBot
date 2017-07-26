module.exports = {
    findUser: function (users, name) {
        for (var i = 0; i < users.length; i++) {
            if (users[i].name == name) {
                return users[i];
            }
        }
    },

    newUser: function (name) {
        return {
            name: name,
            kudosCount: 1,
            totalKudosCount: 1
        }
    },

    winner: function (kudosUsers) {
        var basePoints = 5;
        var devs = [
            {
                name: 'Jason Regnier',
                points: basePoints
            },
            {
                name: 'Sven Vazan',
                points: basePoints
            },
            {
                name: 'Tom Fischer',
                points: basePoints
            }
        ];

        var totalPointsCount = 0;

        for (var j = 0; j < devs.length; j++) {
            if (kudosUsers) {
                for (var i = 0; i < kudosUsers.length; i++) {
                    if (devs[j].name == kudosUsers[i].name) {
                        devs[j].points += kudosUsers[i].kudosCount;
                        break;
                    }
                }
            }

            totalPointsCount += devs[j].points;
        }

        var randomWinner = Math.floor(Math.random() * totalPointsCount);

        for (var i = 0; i < devs.length; i++) {
            randomWinner -= devs[i].points;

            if (randomWinner <= 0) {
                return { name: devs[i].name, index: i };
            }
        }

        return "Invalid";
    }
};