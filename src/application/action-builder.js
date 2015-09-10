const dispatcher = require('../dispatcher');
const {manageResponseErrors} = require('../network/error-parsing');
const {isArray} = require('lodash/lang');
const {identity} = require('lodash/utility');

/**
 * Method call before the service.
 * @param  {Object} config - The action builder config.
 */
function _preServiceCall({node, type, preStatus, callerId, shouldDumpStoreOnActionCall}, payload){
    //There is a problem if the node is empty. //Node should be an array
    let data = {};
    let status = {};
    const STATUS = {name: preStatus, isLoading: true};
    // When there is a multi node update it should be an array.
    if(isArray(node)){
        node.forEach((nd)=>{
            data[nd] = shouldDumpStoreOnActionCall ? null : (payload && payload[nd]) || null;
            status[nd] = STATUS;
        });
    }else{
        data[node] = shouldDumpStoreOnActionCall ? null : (payload || null);
        status[node] = STATUS;
    }
    //Dispatch store cleaning.
    dispatcher.handleViewAction({data, type, status, callerId});
}
/**
 * Method call after the service call.
 * @param  {Object} config - Action builder config.
 * @param  {object} json   - The data return from the service call.
 */
function _dispatchServiceResponse({node, type, status, callerId}, json){
    const isMultiNode = isArray(node);
    const data = isMultiNode ? json : {[node]: json};
    const postStatus = {name: status, isLoading: false};
    let newStatus = {};
    if(isMultiNode){
        node.forEach((nd)=>{newStatus[nd] = postStatus; });
    }else {
        newStatus[node] = postStatus;
    }
    dispatcher.handleServerAction({
        data,
        type,
        status: newStatus,
        callerId
    });
}

/**
 * Method call when there is an error.
 * @param  {object} config -  The action builder configuration.
 * @param  {object} err    - The error from the API call.
 * @return {object}     - The data from the manageResponseErrors function.
 */
function _errorOnCall(config, err){
    console.warn('Error in action', err);
    return manageResponseErrors(err, config);
}

/**
 * Action builder function.
 * @param  {object} config - The action builder configuration should contain:
 *                         - type(:string) - Is the action an update, a load, a save.
 *                         - preStatus(:string) The status to dispatch before the calling.
 *                         - service(:function) The service to call for the action. Should return a Promise.
 *                         - status(:string)} The status after the action.
 * @return {function} - The build action from the configuration. This action dispatch the preStatus, call the service and dispatch the result from the server.
 */
module.exports = function actionBuilder(config = {}){
    config.type = config.type || 'update';
    config.preStatus = config.preStatus || 'loading';
    config.shouldDumpStoreOnActionCall = config.shouldDumpStoreOnActionCall || false;
    if(!config.service){
        throw new Error('You need to provide a service to call');
    }
    if(!config.status){
        throw new Error('You need to provide a status to your action');
    }
    if(!config.node){
        throw new Error('You shoud specify the store node name impacted by the action');
    }
    return function actionBuilderFn(payload) {
        const conf = {callerId: this._identifier, postService: identity, ...config};
        const {postService} = conf;
        _preServiceCall(conf, payload);
        return conf.service(payload).then(postService).then((jsonData)=>{
            return _dispatchServiceResponse(conf, jsonData);
        }, (err)=>{
            return _errorOnCall(conf, err);
        });
    };
};
