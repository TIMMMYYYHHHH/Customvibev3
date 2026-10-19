import {Editor} from '../Editor.jsx';
import HandyStudio from '../designs/HandyStudio.jsx';
import BusinessStudio from '../designs/BusinessStudio.jsx';
import {CollectionReview} from '../CollectionReview.jsx';
import {Checkout} from '../Checkout.jsx';
const views={editor:Editor,handy:HandyStudio,business:BusinessStudio,basket:CollectionReview,checkout:Checkout};
export const serverRouteViews={peek:key=>views[key]||null,load:key=>views[key]?Promise.resolve(views[key]):Promise.reject(Error('Unknown page resource.'))};
