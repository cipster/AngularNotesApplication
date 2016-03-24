var module = angular.module("myapp", ['dndLists', 'ngTagsInput', 'ngRoute']);

module.controller('NotesController',
    function ($scope, $http) {
        $scope.notes = [];
        $scope.sections = [];
        $scope.tags = [];
        $scope.showEditButton = false;
        $scope.noteOrder = {
            order: [{value: "order", label: "Sort by order"}, {value: "text", label: "Sort alphabetically"}, {value: "addedAt", label: "Sort by added date"}],
            selectedOrder: {value: "order", label: "Sort by order"}
        };
        $scope.order = $scope.noteOrder[0];

        $scope.filterByTags = function (note) {
            var retValue = false;
            var tagsFilter = $scope.tagsFilter;

            if (!tagsFilter || tagsFilter.length == 0) return true;
            for (var i = 0; i < tagsFilter.length; i++) {
                if (!note.tags || note.tags.length == 0) return false;
                for (var j = 0; j < note.tags.length; j++) {
                    if (note.tags[j].text == tagsFilter[i].text) {
                        retValue = true;
                    }
                }
            }
            return retValue;
        };

        var emptyResult = function () {
            $scope.opStatus = {
                status: "",
                clazz: ""
            };
        };

        $scope.loadTags = function (query) {
            return $http.get('/tags', {params: {query: query, section: $scope.activeSection}});
        };

        var update = function () {
            $http.get("/notes", {params: {sortBy: $scope.noteOrder.selectedOrder.value, section: $scope.activeSection}})
                .success(function (notes) {
                    $scope.notes = notes;
                });
        };

        emptyResult();
        update();

        $scope.updateOrder = function () {
            update();
        };
        $scope.add = function () {
            if (!$scope.text || $scope.text.length == 0) {
                return;
            }

            var note = {
                text: $scope.text,
                section: $scope.activeSection,
                tags: $scope.tags
            };

            $http.post("/notes", note)
                .success(function () {
                    $scope.text = "";
                    $scope.tags = [];
                    emptyResult();
                    update();
                });
        };

        $scope.removeFromList = function (id) {
            $http.delete("/notes", {params: {id: id}})
                .success(function (result) {
                    $scope.opStatus = result;
                    update();
                });
        };

        $scope.sendToTop = function (id) {
            $http.put("/notes", {params: {id: id, section: $scope.activeSection}})
                .success(function () {
                    emptyResult();
                    update();
                })
        };

        var readSections = function () {
            $http.get("/sections")
                .success(function (sections) {
                    $scope.sections = sections;
                    if (!$scope.activeSection && $scope.sections.length > 0) {
                        $scope.activeSection = sections[0].title;
                    }
                    update();
                })
        };

        readSections();

        $scope.showSections = function (section) {
            $scope.activeSection = section.title;
            $scope.tagsFilter = [];
            update();
        };

        $scope.addSection = function () {
            if ($scope.newSection.length == 0) {
                return;
            }

            for (var i = 0; i < $scope.sections.length; i++) {
                if ($scope.sections[i].title == $scope.newSection) {
                    return;
                }
            }

            var section = {title: $scope.newSection};
            $scope.sections.unshift(section);
            $scope.activeSection = $scope.newSection;
            $scope.newSection = "";
            $scope.writeSections();
            update();
        };

        $scope.writeSections = function () {
            if ($scope.sections && $scope.sections.length > 0) {
                $http.post("/sections/replace", $scope.sections);
            }
        };

        $scope.getEditNote = function (id) {
            $http.get("/notes", {params: {"_id": id, sortBy: $scope.noteOrder.selectedOrder.value, section: $scope.activeSection}})
                .success(function (notes) {
                    var note = notes[0];
                    $scope.text = note.text;
                    $scope.tags = note.tags;
                    $scope.editActiveSection = {title: note.section};
                    $scope.noteIdInEdit = id;
                    $scope.showEditButton = true;
                });
        };

        $scope.editNote = function () {
            var options = {
                "_id": $scope.noteIdInEdit,
                section: $scope.editActiveSection.title,
                text: $scope.text,
                tags: $scope.tags,
                updatedAt: new Date().getTime()
            };
            $http.put("/notes/edit", options)
                .success(function () {
                    $scope.text = "";
                    $scope.tags = [];
                    $scope.activeSection = $scope.editActiveSection.title;
                    $scope.showEditButton = false;
                    update();
                });
        };

        $scope.cancelEdit = function () {
            $scope.text = "";
            $scope.tags = [];
            $scope.showEditButton = false;
        }
    });