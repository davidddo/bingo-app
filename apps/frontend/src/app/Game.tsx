import { useEffect, useState } from 'react';
import { RouteComponentProps } from 'react-router';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faInfo } from '@fortawesome/free-solid-svg-icons';
import {
  BingoField,
  BingoGame,
  ConnectionState,
  ErrorType,
  GameEvent,
  GameEventType,
  getConnectionStateMessage,
  Player,
} from '@bingo/models';
import { BingoCard } from './components/bingo';
import {
  Badge,
  Card,
  CardTitle,
  FlatButton,
  Collapsible,
  CardActions,
  CardHeader,
  CardContent,
  Divider,
} from './components/common';
import {
  useAppBar,
  useAuthContext,
  useGameInstanceContext,
  useGameSocket,
} from './hooks';
import { useHistory } from 'react-router-dom';

interface GameProps {
  gameId: string;
}

interface BottomInfoBarProps {
  field?: BingoField;
  game: BingoGame;
}

interface AdminControlProps {
  game: BingoGame;
  players: Player[];
  state: ConnectionState;
  onDrawNewField: () => void;
  onCloseGame: () => void;
}

const Game = (props: RouteComponentProps<GameProps>) => {
  const id = props.match.params.gameId;
  const history = useHistory();

  const appBar = useAppBar();
  const auth = useAuthContext();

  const {
    game,
    error,
    hasGame,
    loading,
    getGameInstance,
    updateGameField,
  } = useGameInstanceContext();

  const [currentField, setCurrentField] = useState<BingoField>(undefined);
  const [currentPlayers, setCurrentPlayers] = useState<Player[]>([]);
  const { sendEvent, state } = useGameSocket({
    id,
    onMessage: (event: GameEvent) => {
      if (event.type === GameEventType.UNAUTHORIZED) {
        toast.error('Unautorisierter Zugriff');
      } else if (event.type === GameEventType.PLAYER_LEFT) {
        toast('Ein Spieler hat das Spiel verlassen', { icon: '🚶' });
        setCurrentPlayers(event.data?.players ?? []);
      } else if (event.type === GameEventType.PLAYER_JOINED) {
        toast('Ein Spieler ist dem Spiel beigetreten', { icon: '👋' });
        setCurrentPlayers(event.data?.players ?? []);
      } else if (event.type === GameEventType.GAME_JOINED) {
        toast('Du bist dem Spiel beigetreten', { icon: '👋' });
        setCurrentPlayers(event.data?.players ?? []);
      } else if (event.type === GameEventType.NEW_FIELD_DRAWN) {
        const field = event.data.field as BingoField;

        toast('Es wurde ein neues Feld gezogen!', { icon: '🃏' });
        setCurrentField(field);
        updateGameField(field._id, { checked: true });
      } else if (event.type === GameEventType.NO_MORE_FIELDS) {
        toast.error('Es können keine weiteren Felder gezogen werden!');
      } else if (event.type === GameEventType.GAME_CLOSED) {
        toast('Das Spiel wurde vom Admin beendet!', { icon: '❌' });
        history.replace('/');
      }
    },
  });

  useEffect(() => {
    getGameInstance(id);
  }, []);

  useEffect(() => {
    if (error === ErrorType.GAME_NOT_FOUND) {
      history.push('/');
    }
  }, [history, error]);

  useEffect(() => appBar.showLoadingBar(loading), [appBar, loading]);

  const onDrawNewField = () => sendEvent(GameEventType.DRAW_FIELD);
  const onCloseGame = () => sendEvent(GameEventType.CLOSE_GAME);
  const onWin = () => sendEvent(GameEventType.ON_WIN);

  if (error) {
    return <div className="game"></div>;
  }

  return (
    <div className="game">
      {!loading && hasGame && (
        <>
          <div className="game-container">
            {auth.user?._id === game.authorId && (
              <AdminControls
                game={game}
                players={currentPlayers}
                state={state}
                onCloseGame={onCloseGame}
                onDrawNewField={onDrawNewField}
              />
            )}
            <BingoCardHeader />
            {<BingoCard fields={game.instanceFields} onWin={onWin} />}
          </div>
          <BottomInfoBar field={currentField} game={game} />
        </>
      )}
    </div>
  );
};

const BingoCardHeader = () => {
  return (
    <div className="bingo-card-header">
      <div className="letter">B</div>
      <div className="letter">I</div>
      <div className="letter">N</div>
      <div className="letter">G</div>
      <div className="letter">O</div>
    </div>
  );
};

const BottomInfoBar = ({ game, field }: BottomInfoBarProps) => {
  return (
    <div className="bottom-info-bar elevation-z8">
      <Card className="current-field">
        <CardTitle>
          {field
            ? `Aufgedecktes Feld: ${field?.text}`
            : 'Es wurde noch kein Feld aufgedeckt'}
        </CardTitle>
      </Card>
      <FlatButton className="bingo-button">BINGO</FlatButton>
    </div>
  );
};

const AdminControls = ({
  game,
  players,
  state,
  onCloseGame,
  onDrawNewField,
}: AdminControlProps) => {
  const auth = useAuthContext();

  const uncheckedFields = game.fields.filter(field => !field.checked);
  const checkedFields = game.fields.filter(field => field.checked);

  return (
    <Card className="admin-controls">
      <CardHeader>
        <CardTitle>Admin Controls</CardTitle>
        <Badge
          text={getConnectionStateMessage(state)}
          className={state.toLowerCase()}
        />
      </CardHeader>
      <CardContent>
        <Collapsible
          trigger={`Bingo Felder (${uncheckedFields.length}/${checkedFields.length})`}
          className="bingo-fields"
        >
          <h2 className="label">
            Nicht aufgedeckte Felder
            <span className="count">({uncheckedFields.length})</span>
          </h2>
          <Divider />
          {uncheckedFields.map(field => (
            <div key={field._id} className="list-item">
              <span>{field.text}</span>
            </div>
          ))}
          <h2 className="label">
            Aufgedeckte Felder
            <span className="count">({checkedFields.length})</span>
          </h2>
          <Divider />
          {checkedFields.map(field => (
            <div key={field._id} className="list-item">
              <FontAwesomeIcon className="check-icon" icon={faCheck} />
              <span>{field.text}</span>
            </div>
          ))}
        </Collapsible>
        <Collapsible trigger={`Spieler (${players.length})`}>
          {players.map(player => (
            <div key={player._id} className="list-item">
              <span>
                {player.name}
                {auth.user?._id === player._id && <span> (Du)</span>}
              </span>
            </div>
          ))}
        </Collapsible>
      </CardContent>
      <CardActions>
        {uncheckedFields.length === 0 && (
          <div className="info">
            <span>Es wurden alle Felder aufgedeckt!</span>
          </div>
        )}

        {uncheckedFields.length === 0 ? (
          <FlatButton className="warning" onClick={onCloseGame}>
            Spiel beenden
          </FlatButton>
        ) : (
          <FlatButton onClick={onDrawNewField}>Feld aufdecken</FlatButton>
        )}
      </CardActions>
    </Card>
  );
};

export default Game;
