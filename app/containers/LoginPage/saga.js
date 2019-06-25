import React from 'react';
import { call, put, select, takeLatest } from 'redux-saga/effects';
import { FormattedMessage } from 'react-intl';
import decode from 'jwt-decode';
import request from 'utils/request';
import { push } from 'connected-react-router';
import {
  makeIsLoggedSelector,
  makeUserIdSelector,
  makeTokenSelector,
} from 'containers/App/selectors';
import { loggedInAction } from 'containers/App/actions';
import api from 'api';
import messages from './messages';
import { makeLoginSelector, makePasswordSelector } from './selectors';
import { ENTER_LOGIN, ENTER_PASSWORD, IS_LOGGED } from './constants';
import {
  enterLoginSuccessAction,
  enterLoginErrorAction,
  enterPasswordSuccessAction,
  enterPasswordErrorAction,
  stepNextAction,
  loginAction,
  loginSuccessAction,
  loginErrorAction,
} from './actions';

export function* handleLogged() {
  const isLogged = yield select(makeIsLoggedSelector());
  const userId = yield select(makeUserIdSelector());
  const token = yield select(makeTokenSelector());

  if (
    isLogged &&
    userId &&
    token &&
    decode(token).exp > new Date().getTime() / 1000
  ) {
    return yield put(push('/dashboard'));
  }
}

export function* handleLogin() {
  const login = yield select(makeLoginSelector());
  const requestURL = `${api.baseURL}${api.users.isLoginPath}${login}`;
  const isNumber = /^\d+$/;
  const limit = 20;

  if (!login)
    return yield put(
      enterLoginErrorAction(<FormattedMessage {...messages.loginEmpty} />),
    );
  if (!isNumber.test(login) || login.length > limit)
    return yield put(
      enterLoginErrorAction(<FormattedMessage {...messages.loginError} />),
    );

  try {
    const response = yield call(request, requestURL);

    if (!response.isLogin)
      return yield put(
        enterLoginErrorAction(<FormattedMessage {...messages.loginError} />),
      );

    yield put(enterLoginSuccessAction());
    yield put(stepNextAction());
  } catch (error) {
    yield put(
      enterLoginErrorAction(<FormattedMessage {...messages.serverError} />),
    );
  }
}

export function* handlePassword() {
  const password = yield select(makePasswordSelector());
  const limit = 255;

  if (!password)
    return yield put(
      enterPasswordErrorAction(
        <FormattedMessage {...messages.passwordEmpty} />,
      ),
    );
  if (password.length > limit)
    return yield put(
      enterPasswordErrorAction(
        <FormattedMessage {...messages.passwordError} />,
      ),
    );

  yield call(loginAttempt);
}

function* loginAttempt() {
  const login = yield select(makeLoginSelector());
  const password = yield select(makePasswordSelector());
  const requestURL = `${api.baseURL}${api.users.loginPath}`;

  if (!login || !password)
    return yield put(
      loginErrorAction(<FormattedMessage {...messages.loginAttemptError} />),
    );

  try {
    yield put(loginAction(login, password));
    const response = yield call(request, requestURL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        login,
        password,
      }),
    });

    if (!response.success)
      return yield put(
        loginErrorAction(<FormattedMessage {...messages.passwordError} />),
      );

    yield put(enterPasswordSuccessAction());
    yield put(loginSuccessAction());
    yield put(loggedInAction(decode(response.token).id, response.token));
    yield put(push('/dashboard'));
  } catch (error) {
    yield put(loginErrorAction(<FormattedMessage {...messages.serverError} />));
  }
}

export default function* loginPageSaga() {
  yield takeLatest(ENTER_LOGIN, handleLogin);
  yield takeLatest(ENTER_PASSWORD, handlePassword);
  yield takeLatest(IS_LOGGED, handleLogged);
}
