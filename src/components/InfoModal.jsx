// src/components/InfoModal.jsx
import PropTypes from 'prop-types';
import hiddenIcon from '../assets/hidden.png';

const HIDDEN_STATE = "hidden";

const renderTextWithNewlines = (text) => {
  return text.split('\n').map((line, index) => (
    <p className="ma0 pointer-events-auto" key={index}>
      {line}
      <br />
    </p>
  ));
};

function InfoModal({ nodeData, onClose }) {
  if (!nodeData) return null;

  let { label, image, description, state } = nodeData;
  if (state === HIDDEN_STATE) {
    label = "Unknown";
    image = "";
    description = "This node is currently hidden. You must unlock it to view its description.";
  }

  return (
    <div className="info-panel absolute left-0 top-0 w-100 h-100 bg-black-40 white tc bg-blur">
      <div className="w-100 h-100 absolute o-0 left-0 top-0" onClick={onClose}>
        Click here to close
      </div>
      <h2 className="relative z-1 f1 old-english-text-mt ma0 dib mt4">{label}</h2>
      <br />
      <div className="absolute w-100 z-1 h-75 pa4 pointer-events-none">
        {image !== "" ? (
          <img className="o-20 h-100" src={image} alt={label} />
        ) : (
          <img className="o-20 h-100" src={hiddenIcon} alt="hidden item" />
        )}
      </div>
      {description ? (
        <div className="pointer-events-none relative dib ma0 pa3 ph4 f4 z-1 tl lh-copy measure mr-auto ml-auto h-75">
          <div className="ma0 h-100 overflow-y-auto">
            {renderTextWithNewlines(description)}
          </div>
        </div>
      ) : (
        <p className="relative dib ma0 mt3 f4 dib z-1 tc lh-copy mr-auto ml-auto">
          No description available.
        </p>
      )}
    </div>
  );
}

InfoModal.propTypes = {
  nodeData: PropTypes.shape({
    label: PropTypes.string.isRequired,
    image: PropTypes.string.isRequired,
    state: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
  }),
  onClose: PropTypes.func.isRequired,
};

export default InfoModal;
