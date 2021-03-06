require.config({
    paths: {
        "text" : "lib/text",
        "i18n" : "lib/i18n"
    },
    locale: brackets.getLocale()
});

define(function (require, exports, module) {
    "use strict";

    var AppInit                   = brackets.getModule("utils/AppInit"),
        DocumentManager           = brackets.getModule("document/DocumentManager"),
        MainViewManager           = brackets.getModule("view/MainViewManager"),
        ProjectManager            = brackets.getModule("project/ProjectManager"),
        CommandManager            = brackets.getModule("command/CommandManager"),
        PreferencesManager        = brackets.getModule("preferences/PreferencesManager"),
        Menus                     = brackets.getModule("command/Menus"),
        Dialogs                   = brackets.getModule("widgets/Dialogs"),
        StringUtils               = brackets.getModule("utils/StringUtils"),
        ColorUtils               = brackets.getModule("utils/ColorUtils"),
        ExtensionUtils            = brackets.getModule("utils/ExtensionUtils"),
        BracketsStrings           = brackets.getModule("strings"),

        Strings                   = require("strings"),
        ProjectNameDialogTemplate = require("text!./htmlContent/project-name-dialog.html"),

        packageJSON               = require("text!package.json"),
        fileMenu                  = Menus.getMenu(Menus.AppMenuBar.FILE_MENU),
        COMMAND_ID                = JSON.parse(packageJSON).name,

        prefs                     = PreferencesManager.getExtensionPrefs(COMMAND_ID);


    /**
     * Function that runs when "Project Name" is clicked in the File-menu.
     */
    function _showProjectNameDialog() {
        var dialog,
            projectRoot = ProjectManager.getProjectRoot(),
            projectNameConfig = _getProjectNameConfig(projectRoot._path),
            projectName = projectNameConfig ? projectNameConfig.name : projectRoot._name,
            bgColor = projectNameConfig ? projectNameConfig.bgColor : "transparent",
            title = StringUtils.format(Strings.PROJECT_DIALOG_TITLE, projectRoot._name),
            templateVars = {
                title: title,
                path: projectRoot._path,
                Strings: Strings,
                BracketsStrings: BracketsStrings,
                projectName: projectName,
                bgColor: bgColor
            },
            bgColorInput,
            bgColorHint;

        dialog = Dialogs.showModalDialogUsingTemplate(Mustache.render(ProjectNameDialogTemplate, templateVars));

        bgColorInput = dialog.getElement().find("input[name='colorValue']");
        bgColorHint = dialog.getElement().find(".petetnt-name-a-project-color-hint");

        dialog.done(function (id) {
            if (id === Dialogs.DIALOG_BTN_OK) {
                var config = {},
                    value = dialog.getElement().find("input[name='projectName']").val(),
                    name = value.length ? value : projectRoot._name,
                    bgColor = bgColorInput.val();

                config = {
                    _parentPath: projectRoot._path,
                    _name: projectRoot._name,
                    name: name,
                    bgColor: bgColor
                };

                _setProjectNameConfig(config, projectRoot._path);
            }
        });

        bgColorInput.on("keyup", function() {
            var val = $(this).val(); 
            bgColorHint.html("");
            ColorUtils.formatColorHint(bgColorHint, val);
        });
    }

    /**
     * Prefix Recent folders when the Project Dropdown is opened
     */   
    function _prefixRecentFolders() {
        var projectDropdown = $("#project-dropdown"),
            recentFolders = projectDropdown.find(".recent-folder-link");

        recentFolders.each(function (i, elem) {
            var $elem = $(elem),
                path = $elem.data("path") + "/",
                projectNameConfig = _getProjectNameConfig(path);

            if (projectNameConfig) {
                var recentFolder = $elem.find("span").eq(0);
                recentFolder.html(projectNameConfig.name);
                recentFolder.addClass("petetnt-name-a-project-is-named");
                recentFolder.attr("style", "background-color:" + projectNameConfig.bgColor);
            }
        });
    }

    /**
     * Rename the Project Title bar and construct document title with the current name
     */     
    function _renameProjectTitle() {
        var projectRoot = ProjectManager.getProjectRoot(),
            projectPath = projectRoot._path,
            projectNameConfig = _getProjectNameConfig(projectPath),
            $projectTitle = $("#sidebar").find("#project-title");

        if (projectNameConfig) {
            $projectTitle.html(projectNameConfig.name);
            _renameWindowTitle(projectNameConfig.name); 
        }
    } 

    /** 
     *  Rename the window title after DocumentCommandHandler has finished       
     */    
    function _renameWindowTitle(name) {
        setTimeout(function () {
            window.document.title = window.document.title.replace(/\((.*?)\)/g, "(" + name + ")");
        }, 1);   
    }

    /**
     * Get a object representing the path, original name, current name and background color according to the given path
     * @param {string} path 
     * @returns {Object.<string, string, string, string>} Object of _parentPath, _name, name and bgColor
     */   
    function _getProjectNameConfig(path) {
        var namedProjects = prefs.get("namedProjects");
        return namedProjects ? namedProjects[path] : null;
    }

    /**
     * Save current config after changes
     * @param {Object.<string, string, string, string>} config Object of _parentPath, _name, name and bgColor
     * @param {string} path Current project path
     */       
    function _setProjectNameConfig(config, path) {
        var namedProjects = prefs.get("namedProjects");
        namedProjects[path] = config;
        prefs.set("namedProjects", namedProjects);
    }

    // Listen for changes that require updating the editor titlebar
    ProjectManager.on("projectOpen", _renameProjectTitle);
    DocumentManager.on("dirtyFlagChange", _renameProjectTitle);
    DocumentManager.on("fileNameChange", _renameProjectTitle);
    MainViewManager.on("currentFileChange", _renameProjectTitle);
    prefs.on("change", _renameProjectTitle);

    // Handle event dropdown open after htmlReady
    AppInit.htmlReady(function () {
        $("#project-dropdown-toggle").on("click", _prefixRecentFolders);
    });

    // Load stylesheet with ExtensionUtils
    ExtensionUtils.loadStyleSheet(module, "style/style.less");

    // Add command menu items
    CommandManager.register(Strings.PROJECT_NAME, COMMAND_ID, _showProjectNameDialog);
    fileMenu.addMenuItem(COMMAND_ID, null, Menus.LAST_IN_SECTION, Menus.MenuSection.FILE_LIVE);

});
