import { get } from 'lodash/fp';
import Util from './utilities';

const TableUtil = {
  stringSort: k => (a, b) => (get(k, a) || '').localeCompare(get(k, b)),
  numberSort: k => (a, b) => (get(k, a) || 0) - get(k, b),
  dateSort: k => (a, b) => Util.getMoment(get(k, a))?.unix() - Util.getMoment(get(k, b))?.unix(),
};

export default TableUtil;
