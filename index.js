const fs = require('fs');
const xml2js = require('xml2js');
const _ = require('lodash');

// '/Users/serg/locdel-ios/locdel/locdel/Base.lproj/Main.storyboard'
var count = 0;

function cleanStoryboard(dir) {
    count = 0;

    fs.readFile(dir, 'utf8', (err, data) => {
        xml2js.parseString(data, (err, result) => {
            if (err) {
                console.error(err);
                return;
            }

            fetchConstrintsIds(result['document']); // remove 'document'

            fs.writeFile(dir, new xml2js.Builder().buildObject(result), 'utf8', function () {
                console.info(count + ' excluded constraints removed. Thank you for working clean ^_^');
            })
        });
    });
}

function cleanView(view) {
    var viewId = _.get(view, '$.id');
    var variation = view['variation'];
    var consArr = _.get(view, 'constraints[0].constraint');

    if (!variation || !consArr) return;

    var constraintIds = consArr.map(c => {
        return c['$']['id'];
    });

    var variationArr = variation.filter(v => {
        return _.get(v, 'mask.0.$.key') === 'constraints'
    });

    var includedIds = [];
    var excludedIds = [];
    var constraintMasks = [];
    var defaultMask = null;

    variationArr.forEach(v => {
        if (v['$']['key'] == 'default') {
            defaultMask = v['mask'][0]
        } else {
            constraintMasks.push(v['mask'][0])
        }
    });

    var excludesArray = _.concat.apply(_, constraintMasks.map(mask => {
        var excludes = mask['exclude'];
        return _.isArray(excludes) ? excludes : []
    }));

    if (defaultMask) {
        var defaultMasksExcludes = defaultMask['exclude'].map(e => {
            return _.get(e, '$.reference')
        });

        var defaultIncludes = _.difference(constraintIds, defaultMasksExcludes);
        includedIds = _.union(includedIds, defaultIncludes);
        excludedIds = _.union(excludedIds, defaultMasksExcludes);

        excludesArray = _.concat(excludesArray, defaultMask['exclude']);
    }

    constraintMasks.forEach(m => {
        var excludes = m['exclude'];
        if (_.isArray(excludes)) {
            //noinspection JSDuplicatedDeclaration
            var ids = excludes.map(e => {
                return _.get(e, '$.reference')
            });
            excludedIds = _.union(excludedIds, ids);
        }

        var included = m['include'];
        if (_.isArray(included)) {
            //noinspection JSDuplicatedDeclaration
            var ids = included.map(i => {
                return _.get(i, '$.reference');
            });
            includedIds = _.union(includedIds, ids);
        }
    });

    var toExclude = _.difference(excludedIds, includedIds);
    if (toExclude.length == 0) return;

    _.remove(consArr, c => {
        return toExclude.indexOf(c['$']['id']) != -1
    });

    _.remove(excludesArray, e => {
        return toExclude.indexOf(_.get(e, '$.reference')) != -1
    });

    count += toExclude.length;
}

function fetchConstrintsIds(xmlObject) {
    if (!_.isObjectLike(xmlObject)) return; // array, object

    _.forEach(xmlObject, cleanView);
    _.forEach(xmlObject, fetchConstrintsIds);
}

module.exports = cleanStoryboard;