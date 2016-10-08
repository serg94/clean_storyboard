const fs = require('fs');
const xml2js = require('xml2js');
const _ = require('lodash');

var dir1 = '/Users/serg/locdel-ios/locdel/locdel/Base.lproj/Main.storyboard';
var dir2 = dir1;
var count = 0;

fs.readFile(dir1, 'utf8', (err, data) => {
    xml2js.parseString(data, (err, result) => {
        try {
            var scenes = result['document']['scenes'];
            if (!_.isArray(scenes)) {
                console.error('Invalid XML file, there is no ViewControllers or something else :))');
            }
        } catch (ex) {
            console.error('Failed to get scenes from file: ', ex.message);
        }

        fetchConstrintsIds(result['document']);

        console.log(count);

         var v = new xml2js.Builder().buildObject(result);
            fs.writeFile(dir2, v, 'utf8', function (err, data) {
                console.log('done', arguments);
         })
    });


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
});
