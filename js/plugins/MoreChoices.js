
//=============================================================================
// More Choices
//=============================================================================

/*:
 * @target MZ
 * @plugindesc Automatically joins adjacent [Show Choices...] commands into a single list of choices.
 * @author Pwino
 *
 * @help MoreChoices
 *
 * This plugin automatically joins an unlimited amount of adjacent 
 * [Show Choices...] commands into a single list of choices we 
 * will refer to as a [More Choices] block in game.
 *
 * Use it in the following procedure.
 * Place two or more [Show Choices...] commands one right after the other, 
 * they will be automatically joined into a single [More Choices] in game.
 * Disable this behavior by placing any other command in between 
 * two [Show Choices...] commands at the same indentation level, 
 * such as an empty comment.
 * 
 * As for the [Show Choices...] optional parameters:
 * - Background: The behavior of the [More Choices] defaults to 
 *               that of the first [Show Choices...] command.
 * - Window Position: The behavior of the [More Choices] defaults to 
 *                    that of the first [Show Choices...] command.
 * - Default: The behavior of the [More Choices] defaults to that of the 
 *            first [Show Choices...] command, ignoring those set to None.
 *            Set all [Show Choices...] commands as None to set the
 *            [More Choices] behavior to None.
 * - Branch: The behavior of the [More Choices] defaults to that of the 
 *           first [Show Choices...] command that is set to Branch.
 *           If no commands are set to Branch, the behavior defaults to that of 
 *           the first [Show Choices...] command, ignoring those set to Disallow.
 *           Set all [Show Choices...] commands as Disallow to set the
 *           [More Choices] behavior to Disallow.
 *
 */

//-----------------------------------------------------------------------------

(() => {
    'use strict';

    let _Game_SetupChoices = Game_Interpreter.prototype.setupChoices;
    Game_Interpreter.prototype.setupChoices = function (params) {
        params = this.joinChoices(params);
        _Game_SetupChoices.call(this, params);
    };

    // If multiple cancel branches found only first stays
    Game_Interpreter.prototype.joinChoices = function (params) {
        // prevent event from being modified permanently
        this._list = JSON.parse(JSON.stringify(this._list))
        let choices = params[0].clone();
        let cancelType = params[1];
        let defaultType = params[2];
        const positionType = params[3];
        const background = params[4];

        let foundCancelBranch = false;
        let thisCommand = this.currentCommand(); // Command 102
        let nextCommandId = this._index;
        let nextCommand = thisCommand;
        let choicesCount = 0;
        const deleteIds = []; // list of 102 commands to remove

        // nextCommand starts as 102 command
        while (nextCommand.code === 102) {
            // join all 102 parameters and set intermediate 102 for delete
            if (nextCommandId !== this._index) {
                deleteIds.push(nextCommandId - 1);
                deleteIds.push(nextCommandId);

                cancelType = chooseCancelType(cancelType, nextCommand.parameters[1], choices.length);
                defaultType = chooseDefaultType(defaultType, nextCommand.parameters[2], choices.length);
                choices = choices.concat(nextCommand.parameters[0].clone());
            }

            nextCommandId = this.nextEqualIndentCommandId(nextCommandId);
            nextCommand = this.getCommand(nextCommandId); // Command 402

            // stop at non single choice branch command (402/403)
            while (nextCommand.code === 402 || nextCommand.code === 403) {
                if (nextCommand.code === 403) {
                    if (foundCancelBranch) deleteIds.push(nextCommandId);
                    foundCancelBranch = true;
                }
                nextCommand.parameters[0] = choicesCount++;
                nextCommandId = this.nextEqualIndentCommandId(nextCommandId);
                nextCommand = this.getCommand(nextCommandId)
            }

            // nextCommand value should be end of show choices (404)
            // console.assert(nextCommand.code === 404);

            // move nextCommand to start of next command
            nextCommandId = this.nextEqualIndentCommandId(nextCommandId);
            nextCommand = this.getCommand(nextCommandId);
        }

        // delete all intermediate 404, 403 and 102 commands
        for (let idx = deleteIds.length - 1; idx >= 0; idx--) {
            this._list.splice(deleteIds[idx], 1);
        }
        return [ choices, cancelType, defaultType, positionType, background ];
    }

    Game_Interpreter.prototype.nextEqualIndentCommandId = function (commandId) {
        const currentCommand = this.getCommand(commandId);
        let nextId = commandId + 1;
        let nextCommand = this.getCommand(nextId);
        while (nextCommand.indent != currentCommand.indent) {
            nextCommand = this.getCommand(++nextId);
        }
        return nextId;
    };

    Game_Interpreter.prototype.getCommand = function (commandId) {
        const command = this._list[commandId];
        if (command) {
            return command;
        } else {
            return {};
        }
    };

    // Cancel types reminder:
    // -1 => Disallowed
    // -2 => Branch
    // Branch overrides all else
    // Set to disallow to default to the other "show choices" command's cancel type
    function chooseCancelType(type1, type2, offset) {
        if (type1 === -2 || type2 === -2) return -2;

        if (type2 === -1) return type1;
        else if (type1 === -1) return type2 === -1 ? type2 : type2 + offset;

        return type1;
    }

    // Default choice types reminder:
    // -1 => None
    // Set to None to default to the other "show choices" command's value
    function chooseDefaultType(type1, type2, offset) {
        if (type1 === -1) return type2 === -1 ? type2 : type2 + offset;

        return type1;
    }

})();

